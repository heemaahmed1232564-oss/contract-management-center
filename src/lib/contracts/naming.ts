const TOKEN_PATTERN = /\{([a-z_]+)\}/g;
const INVALID_FILE_CHARS = /[\\/:*?"<>|%]/g;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export type NamingValues = {
  reference_number: string;
  agency_code: string;
  package_code: string;
  client_name?: string | null;
  employee_name: string;
  date: string;
};

export const DEFAULT_NAMING_PATTERN =
  "{reference_number} - {agency_code} - {package_code} - {client_name} - {employee_name} - {date}";

export function sanitizeFilePart(value: string | null | undefined, fallback = "NA") {
  const cleaned = (value ?? "")
    .normalize("NFKC")
    .replace(INVALID_FILE_CHARS, "-")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, "");
  return cleaned || fallback;
}

export function buildContractFileName(
  pattern: string | null | undefined,
  values: NamingValues,
  maxLength = 180,
) {
  const replacements: Record<string, string> = {
    reference_number: sanitizeFilePart(values.reference_number),
    agency_code: sanitizeFilePart(values.agency_code),
    package_code: sanitizeFilePart(values.package_code),
    client_name: sanitizeFilePart(values.client_name, "No-Client-Name"),
    employee_name: sanitizeFilePart(values.employee_name, "Unknown-Employee"),
    date: sanitizeFilePart(values.date),
  };

  const rendered = (pattern || DEFAULT_NAMING_PATTERN)
    .replace(TOKEN_PATTERN, (_match, token: string) => replacements[token] ?? "NA")
    .replace(/\s+-\s+-\s+/g, " - ")
    .trim();

  if (rendered.length <= maxLength) return rendered;
  const reference = replacements.reference_number;
  const suffix = ` - ${reference}`;
  return `${rendered.slice(0, Math.max(1, maxLength - suffix.length)).trim()}${suffix}`.slice(
    0,
    maxLength,
  );
}
