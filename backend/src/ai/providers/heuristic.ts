import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, type CrmFieldName } from "../../types/crm.js";
import type { BatchRowInput } from "../prompt.js";
import type { ValidatedAiBatchResponse } from "../schema.js";
import type { AiProvider } from "../types.js";

/**
 * Deterministic, no-API-key fallback so the whole pipeline (upload -> batch
 * -> extract -> validate -> results) is runnable and demoable without any
 * LLM credentials configured. It uses fuzzy header aliasing + regex
 * extraction rather than a real LLM, so it is intentionally less capable at
 * ambiguous columns than the OpenAI/Gemini/Anthropic providers.
 */
const FIELD_ALIASES: Record<CrmFieldName, RegExp[]> = {
  created_at: [/^(created|date|created.?at|lead.?date|timestamp|submitted|when|enquiry.?date|added.?on)/i],
  name: [/^(full.?name|name|lead.?name|contact.?name|first.?name)/i],
  email: [/e.?mail/i],
  country_code: [/country.?code|isd/i],
  mobile_without_country_code: [/mobile|phone|contact.?no|whatsapp|cell/i],
  company: [/company|organi[sz]ation|business/i],
  city: [/city|town/i],
  state: [/state|province|region/i],
  country: [/^country$/i],
  lead_owner: [/owner|assigned|agent|rep\b|sales|executive|handled.?by|handler/i],
  crm_status: [/status|stage|disposition/i],
  crm_note: [/note|remark|comment/i],
  data_source: [/source|campaign|utm.?source|project/i],
  possession_time: [/possession/i],
  description: [/description|requirement|budget|message/i],
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s-]{6,14}\d)/g;
// DD-MM-YYYY / YYYY-MM-DD shaped strings match PHONE_RE structurally but are
// dates, not phone numbers — filter them out of phone candidates.
const DATE_SHAPED_RE = /^\d{1,2}-\d{1,2}-\d{4}$|^\d{4}-\d{1,2}-\d{1,2}$/;

function matchColumn(headers: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const hit = headers.find((h) => pattern.test(h));
    if (hit) return hit;
  }
  return undefined;
}

function normalizeStatus(raw: string): string {
  const v = raw.toLowerCase();
  if (CRM_STATUS_VALUES.some((s) => s.toLowerCase() === v)) return raw.toUpperCase();
  if (/(interested|follow.?up|good)/.test(v)) return "GOOD_LEAD_FOLLOW_UP";
  if (/(not.?connect|no.?answer|rnr|busy|unreach)/.test(v)) return "DID_NOT_CONNECT";
  if (/(not.?interest|junk|invalid|bad)/.test(v)) return "BAD_LEAD";
  if (/(closed.?won|converted|booked|sale)/.test(v)) return "SALE_DONE";
  return "";
}

function normalizeSource(raw: string): string {
  const v = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const hit = DATA_SOURCE_VALUES.find((s) => v.includes(s));
  return hit ?? "";
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return raw;
  return "";
}

export class HeuristicProvider implements AiProvider {
  readonly name = "heuristic";

  async extractBatch(headers: string[], rows: BatchRowInput[]): Promise<ValidatedAiBatchResponse> {
    const columnFor = Object.fromEntries(
      (Object.keys(FIELD_ALIASES) as CrmFieldName[]).map((field) => [
        field,
        matchColumn(headers, FIELD_ALIASES[field]),
      ]),
    ) as Record<CrmFieldName, string | undefined>;

    const results = rows.map(({ row_id, data }) => {
      const get = (field: CrmFieldName) => {
        const col = columnFor[field];
        return col ? (data[col] ?? "").trim() : "";
      };

      // Free-text email/phone scan only looks at columns NOT already
      // confidently matched to a non-contact field. Without this, a date
      // column like "14-05-2026" can false-positive-match the phone regex,
      // and an owner column's email can be mistaken for the lead's own.
      const NON_CONTACT_FIELDS: CrmFieldName[] = [
        "created_at",
        "name",
        "company",
        "city",
        "state",
        "country",
        "lead_owner",
        "crm_status",
        "data_source",
        "possession_time",
        "description",
      ];
      const excludedCols = new Set(NON_CONTACT_FIELDS.map((f) => columnFor[f]).filter((c): c is string => Boolean(c)));
      const scanCols = headers.filter((h) => !excludedCols.has(h));
      // Match per-column rather than on a joined string: joining unrelated
      // column values with a space lets the permissive phone regex bridge
      // across them (e.g. a "3" from one column + a date from the next
      // reads as one plausible-looking 10-digit run).
      const emails = scanCols.flatMap((h) => (data[h] ?? "").match(EMAIL_RE) ?? []);
      const rawPhones = scanCols.flatMap((h) =>
        ((data[h] ?? "").match(PHONE_RE) ?? []).filter((candidate) => !DATE_SHAPED_RE.test(candidate.trim())),
      );

      const fieldEmail = get("email");
      const fieldMobile = get("mobile_without_country_code");
      const email = fieldEmail || emails[0] || "";
      const rawMobile = fieldMobile || rawPhones[0] || "";

      if (!email && !rawMobile) {
        return { row_id, status: "skipped" as const, skip_reason: "No email or phone number found" };
      }

      // Split into country code + number by assuming a 10-digit mobile
      // number (true for India and common enough elsewhere). This is more
      // reliable than parsing on whitespace, since "+919876543210" has no
      // delimiter to tell a human-readable regex where the code ends.
      const splitPhone = (raw: string): { countryCode: string; number: string } => {
        const digitsOnly = raw.replace(/\D/g, "");
        if (digitsOnly.length > 10) {
          return { countryCode: `+${digitsOnly.slice(0, -10)}`, number: digitsOnly.slice(-10) };
        }
        return { countryCode: "", number: digitsOnly };
      };

      const { countryCode: parsedCc, number: mobile } = splitPhone(rawMobile);
      const countryCode = get("country_code") || parsedCc;

      const cleanedPhones = rawPhones.map((p) => splitPhone(p).number);
      const extraEmails = emails.filter((e) => e !== email);
      const extraPhones = cleanedPhones.filter((p) => p !== mobile);
      const noteParts = [get("crm_note")].filter(Boolean);
      if (extraEmails.length) noteParts.push(`Extra emails: ${extraEmails.join(", ")}`);
      if (extraPhones.length) noteParts.push(`Extra phones: ${extraPhones.join(", ")}`);

      return {
        row_id,
        status: "imported" as const,
        record: {
          created_at: normalizeDate(get("created_at")),
          name: get("name"),
          email,
          country_code: countryCode,
          mobile_without_country_code: mobile,
          company: get("company"),
          city: get("city"),
          state: get("state"),
          country: get("country"),
          lead_owner: get("lead_owner"),
          crm_status: normalizeStatus(get("crm_status")),
          crm_note: noteParts.join(" | "),
          data_source: normalizeSource(get("data_source")),
          possession_time: get("possession_time"),
          description: get("description"),
        },
      };
    });

    return { results };
  }
}
