import { DEFAULT_STARTING_BALANCE, LOAN_STATUS, TRANSACTION_STATUS, USER_ROLE } from "../core/constants.js";
import { isSafePhoto } from "../core/profile-photo.js";
import { AccountRepository, LoanRepository, NotificationRepository, TransactionRepository, UserRepository, storage } from "../data/repositories.js";

const users = new UserRepository();
const accounts = new AccountRepository();
const transactions = new TransactionRepository();
const loans = new LoanRepository();
const notifications = new NotificationRepository();

// Services validate demo workflows here; production rules must be repeated by a trusted backend.
function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeAccountId() {
  // Random numbers can collide. Check existing accounts and retry, then pad the
  // result as a string so an account number beginning with zero keeps all 10 digits.
  let accountId;
  do {
    const digits = new Uint32Array(1);
    crypto.getRandomValues(digits);
    accountId = String(digits[0] % 1_000_000_000).padStart(10, "0");
  } while (accounts.findAccountByAccountId(accountId));
  return accountId;
}

export class AuthService {
  constructor(stateManager) {
    this.stateManager = stateManager;
    // These public demo credentials are fictional and provide no security boundary.
    this.credentials = new Map([
      ["amina@digibank.test", "DigiBankDemo!2026"],
      ["admin@digibank.test", "DigiBankAdmin!2026"],
    ]);
    this.recoveryCodes = new Map();
  }

  getCurrentUser() { return users.findById(this.stateManager.getCurrentUserId()); }

  updateProfilePhoto(photo) {
    // Derive the owner from the current session rather than trusting a user ID
    // from a form. null intentionally means "remove photo and show initials".
    const user = this.getCurrentUser();
    if (!user || user.role !== USER_ROLE.CUSTOMER) throw new Error("Sign in as a customer to update your photo.");
    if (photo !== null && !isSafePhoto(photo)) throw new Error("Choose a valid profile photo.");
    users.updatePhoto(user.id, photo);
  }

  signup(formValues) {
    // Normalize before checking duplicates: surrounding spaces and email casing
    // should not let the same address create multiple fictional accounts.
    const fullName = formValues.fullName.trim().replace(/\s+/g, " ");
    const username = formValues.username.trim().toLowerCase();
    const email = formValues.email.trim().toLowerCase();
    const phone = formValues.phone.replace(/\s+/g, "");
    const password = formValues.password;
    if (!fullName || !username || !email || !phone || password.length < 10) throw new Error("Check each field and use a password with at least 10 characters.");
    if (!/^[0-9+()-]{7,20}$/.test(phone)) throw new Error("Enter a valid phone number using digits and common phone punctuation.");
    if (users.findByEmail(email)) throw new Error("An account already uses this email address.");
    if (users.all().some((user) => user.username.toLowerCase() === username)) throw new Error("That username is already in use.");
    const user = users.create({ id: makeId("user"), fullName, username, email, phone, role: USER_ROLE.CUSTOMER, createdAt: new Date().toISOString() });
    const account = accounts.create({ accountId: makeAccountId(), userId: user.id, balance: DEFAULT_STARTING_BALANCE, status: "ACTIVE", createdAt: new Date().toISOString() });
    this.credentials.set(email, password);
    this.stateManager.setCurrentUser(user);
    return { user, account };
  }

  login(emailValue, password, requiredRole = USER_ROLE.CUSTOMER) {
    // Use the same failure message for an unknown email and an incorrect password.
    // That avoids telling a visitor which of those two checks failed.
    const email = emailValue.trim().toLowerCase();
    const user = users.findByEmail(email);
    if (!user || this.credentials.get(email) !== password || user.role !== requiredRole) throw new Error("Email or password is incorrect.");
    this.stateManager.setCurrentUser(user);
    return user;
  }

  requestPasswordReset(emailValue) {
    const email = emailValue.trim().toLowerCase();
    const user = users.findByEmail(email);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    if (user && user.role === USER_ROLE.CUSTOMER) this.recoveryCodes.set(email, code);
    return { accepted: true, demoCode: user?.role === USER_ROLE.CUSTOMER ? code : null, email };
  }

  verifyRecoveryCode(emailValue, code) {
    const email = emailValue.trim().toLowerCase();
    if (!this.recoveryCodes.has(email) || this.recoveryCodes.get(email) !== code.trim()) throw new Error("That code is invalid or has expired. Request a new code.");
    return email;
  }

  resetPassword(email, code, password) {
    this.verifyRecoveryCode(email, code);
    if (password.length < 10) throw new Error("Use at least 10 characters for your new password.");
    this.credentials.set(email, password);
    this.recoveryCodes.delete(email);
  }

  logout() { this.stateManager.setCurrentUser(null); }
}

export class BankingService {
  getAccount(userId) { return accounts.findByUserId(userId); }
  getTransactions(userId) {
    const account = this.getAccount(userId);
    return account ? transactions.findForAccount(account.accountId) : [];
  }
  getLoans(userId) { return loans.findForUser(userId); }
  getNotifications(userId) { return notifications.findForUser(userId); }

  transfer(senderId, recipientId, rawAmount, descriptionValue) {
    const amount = Number(rawAmount);
    const senderAccount = accounts.findByUserId(senderId);
    const recipientAccount = accounts.findAccountByAccountId(recipientId.trim());
    if (!senderAccount || !recipientAccount) throw new Error("Check the recipient account number and try again.");
    if (recipientAccount.accountId === senderAccount.accountId) throw new Error("Choose a different recipient account.");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) throw new Error("Enter a valid amount greater than zero.");
    if (senderAccount.balance < amount) throw new Error("There are not enough funds for this transfer.");
    const senderBalance = senderAccount.balance - amount;
    const recipientBalance = recipientAccount.balance + amount;
    const reference = makeId("DB").toUpperCase();
    const createdAt = new Date().toISOString();
    // The two account entries represent opposite sides of the same transfer and
    // share a reference. These separate browser writes are only a simulation;
    // a real backend must commit balances and records together in one transaction.
    accounts.update(senderAccount.accountId, { balance: senderBalance });
    accounts.update(recipientAccount.accountId, { balance: recipientBalance });
    transactions.createMany([
      { id: makeId("txn"), accountId: senderAccount.accountId, counterpartyAccountId: recipientAccount.accountId, type: "DEBIT", description: descriptionValue.trim() || "Transfer", amount, reference, balanceAfter: senderBalance, status: TRANSACTION_STATUS.SUCCESS, createdAt },
      { id: makeId("txn"), accountId: recipientAccount.accountId, counterpartyAccountId: senderAccount.accountId, type: "CREDIT", description: descriptionValue.trim() || "Transfer received", amount, reference, balanceAfter: recipientBalance, status: TRANSACTION_STATUS.SUCCESS, createdAt },
    ]);
    notifications.create({ id: makeId("notice"), userId: senderId, type: "TRANSFER", message: `Transfer of ${amount.toLocaleString("en-NG")} completed.`, read: false, createdAt });
    notifications.create({ id: makeId("notice"), userId: recipientAccount.userId, type: "TRANSFER", message: `You received ${amount.toLocaleString("en-NG")} from a DigiBank account.`, read: false, createdAt });
    return { reference, balance: senderBalance };
  }

  requestLoan(userId, rawAmount, purposeValue) {
    const amount = Number(rawAmount);
    const purpose = purposeValue.trim();
    if (!Number.isFinite(amount) || amount < 10000 || amount > 5000000) throw new Error("Loan amount must be between ₦10,000 and ₦5,000,000.");
    if (purpose.length < 8 || purpose.length > 240) throw new Error("Describe the purpose in 8 to 240 characters.");
    if (loans.findForUser(userId).some((loan) => loan.status === LOAN_STATUS.PENDING)) throw new Error("You already have a pending loan request.");
    return loans.create({ id: makeId("loan"), userId, amount, purpose, status: LOAN_STATUS.PENDING, reviewedBy: null, rejectionReason: null, createdAt: new Date().toISOString(), reviewedAt: null });
  }
}

export class AdminService {
  getSummary() {
    const allUsers = users.all().filter((user) => user.role === USER_ROLE.CUSTOMER);
    const recentNotifications = notifications.all().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 8);
    return { customers: allUsers.length, pendingLoans: loans.all().filter((loan) => loan.status === LOAN_STATUS.PENDING).length, transactions: transactions.all().length, loans: loans.all(), notifications: recentNotifications };
  }

  reviewLoan(adminUser, loanId, decision, reason = "") {
    // Only pending requests can change status. Rechecking here prevents a normal
    // repeated click from reviewing an already-completed request a second time.
    if (adminUser?.role !== USER_ROLE.ADMIN) throw new Error("Administrator access is required for this action.");
    const loan = loans.findById(loanId);
    if (!loan || loan.status !== LOAN_STATUS.PENDING) throw new Error("This request has already been reviewed or is unavailable.");
    if (![LOAN_STATUS.APPROVED, LOAN_STATUS.REJECTED].includes(decision)) throw new Error("Choose a valid review decision.");
    if (decision === LOAN_STATUS.REJECTED && reason.trim().length < 5) throw new Error("Enter a rejection reason of at least 5 characters.");
    loans.update(loanId, { status: decision, reviewedBy: adminUser.id, rejectionReason: decision === LOAN_STATUS.REJECTED ? reason.trim() : null, reviewedAt: new Date().toISOString() });
    notifications.create({ id: makeId("notice"), userId: loan.userId, type: "LOAN", message: `Your loan request was ${decision.toLowerCase()}.`, read: false, createdAt: new Date().toISOString() });
  }
}

export function resetMockData() {
  storage.reset();
}
