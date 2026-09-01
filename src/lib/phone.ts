import parsePhoneNumber from "libphonenumber-js/max";

const DEFAULT_COUNTRY = "PK";

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = parsePhoneNumber(trimmed, DEFAULT_COUNTRY);
    if (parsed?.isValid()) return parsed.number;
  } catch {
    // Use the same friendly validation message for every parser failure.
  }
  throw new Error(
    "Enter a valid phone number, for example 0300 1234567 or +92 300 1234567.",
  );
}

export function displayPhoneNumber(value: string) {
  if (!value.trim()) return "";
  try {
    return (
      parsePhoneNumber(value, DEFAULT_COUNTRY)?.formatInternational() ?? value
    );
  } catch {
    return value;
  }
}

export function phoneCallHref(value: string) {
  const phone = normalizePhoneNumber(value);
  return phone ? `tel:${phone}` : "";
}
