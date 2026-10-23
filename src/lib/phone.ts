const STORAGE_KEY = "client_phone";
const E164 = /^\+[1-9]\d{7,14}$/;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toMexicoE164(digits: string): string | null {
  if (!/^\d{10}$/.test(digits)) return null;
  const phone = `+52${digits}`;
  return E164.test(phone) ? phone : null;
}

export function readStoredPhone(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored || !E164.test(stored)) return null;
  return stored;
}

export function storePhone(phone: string): void {
  localStorage.setItem(STORAGE_KEY, phone);
}

export function clearStoredPhone(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatPhone(phone: string): string {
  const match = phone.match(/^\+52(\d{2})(\d{4})(\d{4})$/);
  if (!match) return phone;
  return `+52 ${match[1]} ${match[2]} ${match[3]}`;
}
