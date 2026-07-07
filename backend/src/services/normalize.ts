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
