import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, type CrmRecord } from "../types/crm.js";

const STATUS_SET = new Set<string>(CRM_STATUS_VALUES);
const SOURCE_SET = new Set<string>(DATA_SOURCE_VALUES);

/**
 * Defense-in-depth: the prompt instructs the AI to only use allowed enum
 * values and valid dates, but we never trust an LLM's output blindly. This
 * re-validates every field server-side so a hallucinated enum or malformed
 * date can never reach the client.
 */
export function normalizeRecord(raw: Partial<Record<keyof CrmRecord, string>>): CrmRecord {
  const str = (v: string | undefined) => (v ?? "").trim();

  const crmStatus = str(raw.crm_status).toUpperCase();
  const dataSource = str(raw.data_source).toLowerCase();
  const createdAt = str(raw.created_at);
  const validDate = createdAt && !Number.isNaN(new Date(createdAt).getTime());

  return {
    created_at: validDate ? createdAt : "",
    name: str(raw.name),
    email: str(raw.email),
    country_code: str(raw.country_code),
    mobile_without_country_code: str(raw.mobile_without_country_code),
    company: str(raw.company),
    city: str(raw.city),
    state: str(raw.state),
    country: str(raw.country),
    lead_owner: str(raw.lead_owner),
    crm_status: STATUS_SET.has(crmStatus) ? (crmStatus as CrmRecord["crm_status"]) : "",
    crm_note: str(raw.crm_note),
    data_source: SOURCE_SET.has(dataSource) ? (dataSource as CrmRecord["data_source"]) : "",
    possession_time: str(raw.possession_time),
    description: str(raw.description),
  };
}

export function hasContactInfo(record: CrmRecord): boolean {
  return Boolean(record.email || record.mobile_without_country_code);
}

const PHONE_CANDIDATE_RE = /\+?\d[\d\s-]{6,14}\d/g;
const EMAIL_PRESENCE_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PRESENCE_RE = /\+?\d[\d\s-]{6,14}\d/;
// A lead's owner/rep is a different person from the lead — their email/phone
// must never be recovered as if it were the lead's own contact info.
const OWNER_HEADER_RE = /owner|assigned|agent|\brep\b|sales|executive|handled.?by|handler/i;
// DD-MM-YYYY / YYYY-MM-DD shaped strings match the phone regex structurally
// but are dates, not phone numbers.
const DATE_SHAPED_RE = /^\d{1,2}-\d{1,2}-\d{4}$|^\d{4}-\d{1,2}-\d{1,2}$/;

function nonOwnerValues(original: Record<string, string>): string[] {
  return Object.entries(original)
    .filter(([header]) => !OWNER_HEADER_RE.test(header))
    .map(([, value]) => value ?? "");
}

/**
 * The "skip if no email AND no phone" rule is a hard, mechanically checkable
 * rule (unlike e.g. crm_status, which needs real judgment). If the AI skips
 * a row anyway despite an email/phone clearly being present in the source,
 * this recovers minimal contact info rather than silently dropping a valid
 * lead — everything else about field mapping still comes from the AI.
 */
export function extractFallbackContact(
  original: Record<string, string>,
): Pick<CrmRecord, "email" | "country_code" | "mobile_without_country_code"> | null {
  const text = nonOwnerValues(original).join(" ");
  const emailMatch = text.match(EMAIL_PRESENCE_RE);
  const phoneMatch = text.match(PHONE_PRESENCE_RE);
  if (!emailMatch && !phoneMatch) return null;

  let countryCode = "";
  let mobile = "";
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, "");
    if (digits.length > 10) {
      countryCode = `+${digits.slice(0, -10)}`;
      mobile = digits.slice(-10);
    } else {
      mobile = digits;
    }
  }

  return { email: emailMatch?.[0] ?? "", country_code: countryCode, mobile_without_country_code: mobile };
}

/**
 * Cross-checks the AI's phone split against the original row and repairs it
 * if the digits don't actually appear in the source. LLMs occasionally
 * mistranscribe long digit runs, or assign the wrong column's value to the
 * phone field entirely (e.g. a timestamp instead of the actual phone
 * column) — this catches that rather than shipping a corrupted or
 * completely wrong phone number to the client.
 */
export function repairPhoneFromSource(record: CrmRecord, original: Record<string, string>): CrmRecord {
  const aiDigits = (record.country_code + record.mobile_without_country_code).replace(/\D/g, "");
  if (!aiDigits) return record;

  const candidates = nonOwnerValues(original)
    .flatMap((value) => value.match(PHONE_CANDIDATE_RE) ?? [])
    .filter((match) => !DATE_SHAPED_RE.test(match.trim()))
    .map((match) => match.replace(/\D/g, ""))
    .filter((digits) => digits.length >= 7 && digits.length <= 15)
    // Prefer candidates shaped like a real phone number (10-13 digits,
    // i.e. a bare mobile or one with a short country code prefix) over
    // shorter incidental digit runs.
    .sort((a, b) => Number(b.length >= 10 && b.length <= 13) - Number(a.length >= 10 && a.length <= 13));

  const isConsistent = candidates.some(
    (digits) => digits.includes(aiDigits) || aiDigits.includes(digits),
  );
  if (isConsistent || candidates.length === 0) return record;

  const best = candidates[0];
  if (!best) return record;
  const [countryCode, mobile] =
    best.length > 10 ? [`+${best.slice(0, -10)}`, best.slice(-10)] : ["", best];

  return { ...record, country_code: countryCode, mobile_without_country_code: mobile };
}
