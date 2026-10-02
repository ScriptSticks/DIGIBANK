export const APP_NAME = "DigiBank";
export const DEFAULT_STARTING_BALANCE = 250000;
export const STORAGE_KEY = "digibank.mock-data.v1";
export const USER_ROLE = Object.freeze({ CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" });
export const LOAN_STATUS = Object.freeze({ PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" });
export const TRANSACTION_STATUS = Object.freeze({ SUCCESS: "SUCCESS", PENDING: "PENDING", FAILED: "FAILED" });
export const CURRENCY = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export function formatMoney(amount) {
  return CURRENCY.format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}