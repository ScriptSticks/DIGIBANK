export const APP_NAME = "DigiBank";
export const DEFAULT_STARTING_BALANCE = 250000;
export const STORAGE_KEY = "digibank.mock-data.v1";
// Shared status values prevent spelling differences between storage, services,
// and page templates. Freezing these objects stops accidental edits at runtime.
export const USER_ROLE = Object.freeze({ CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" });
export const LOAN_STATUS = Object.freeze({ PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" });
export const TRANSACTION_STATUS = Object.freeze({ SUCCESS: "SUCCESS", PENDING: "PENDING", FAILED: "FAILED" });
export const CURRENCY = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export function formatMoney(amount) {
  // Keep values numeric for calculations; apply currency symbols and separators
  // only at display time. Never feed this formatted string back into arithmetic.
  return CURRENCY.format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
