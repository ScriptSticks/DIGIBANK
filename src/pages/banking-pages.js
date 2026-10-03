import { DEFAULT_STARTING_BALANCE, formatDate, formatMoney } from "../core/constants.js";
import { escapeHTML } from "../core/text.js";
import { icon } from "../components/icons.js";
import { avatar } from "../components/avatar.js";
import { editableAvatar, profilePhotoEditor } from "../components/profile-photo-editor.js";

// Page functions only build markup from the data they receive. main.js owns user
// interactions and services own updates. Escape record values before interpolation;
// interpolated fragments such as avatar() are trusted, application-built HTML.
function heading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">Your DigiBank</p><h1>${title}</h1><p class="subheading">${subtitle}</p></div>${action}</div>`;
}

function emptyState(message) {
  return `<div class="empty-state">${icon("empty")}<div>${message}</div></div>`;
}

function transactionRows(transactionList) {
  if (!transactionList.length) return `<tr><td colspan="5">${emptyState("No transactions yet. Your account activity will appear here.")}</td></tr>`;
  return transactionList.map((transaction) => `<tr><td><span class="transaction-name">${escapeHTML(transaction.description)}</span><span class="transaction-date">${formatDate(transaction.createdAt)}</span></td><td>${transaction.type === "CREDIT" ? "Received" : "Transfer"}</td><td>${escapeHTML(transaction.counterpartyAccountId)}</td><td class="${transaction.type === "CREDIT" ? "amount-credit" : "amount-debit"}">${transaction.type === "CREDIT" ? "+" : "−"}${formatMoney(transaction.amount)}</td><td><span class="status-pill">${escapeHTML(transaction.status)}</span></td></tr>`).join("");
}

export function dashboardPage({ user, account, transactions: transactionList, loans, notifications }) {
  const recent = transactionList.slice(0, 4);
  const currentLoan = loans[0];
  const notificationList = notifications.slice(0, 3);
  const recentRows = recent.length ? recent.map((transaction) => `<div class="detail-row"><span>${escapeHTML(transaction.description)}<small class="d-block mt-1">${formatDate(transaction.createdAt)}</small></span><strong class="${transaction.type === "CREDIT" ? "amount-credit" : "amount-debit"}">${transaction.type === "CREDIT" ? "+" : "−"}${formatMoney(transaction.amount)}</strong></div>`).join("") : emptyState("No recent activity yet.");
  const notices = notificationList.length ? notificationList.map((notification) => `<div class="detail-row"><span>${escapeHTML(notification.message)}</span><span class="status-pill neutral">New</span></div>`).join("") : `<div class="text-secondary small py-2">You’re all caught up.</div>`;
  return `${heading(`Good day, ${escapeHTML(user.fullName.split(" ")[0])}`, "Here’s what’s happening with your account today.")}
    <div class="row g-3 g-lg-4 mb-4"><div class="col-lg-7"><section class="surface balance-panel h-100"><span class="balance-label">Available balance</span><div class="balance-amount"><span data-balance>${formatMoney(account?.balance ?? DEFAULT_STARTING_BALANCE)}</span><button class="icon-button" type="button" data-action="toggle-balance" aria-label="Hide balance">${icon("eye")}</button></div><div class="balance-meta">Account number · <strong>${escapeHTML(account?.accountId ?? "Not available")}</strong><button class="icon-button ms-2" type="button" data-action="copy-account" aria-label="Copy account number">${icon("copy")}</button></div></section></div>
      <div class="col-lg-5"><section class="surface p-3 h-100"><h2 class="section-title">Your profile</h2><div class="profile-row mb-3">${avatar(user)}<div><strong>${escapeHTML(user.fullName)}</strong><small>${escapeHTML(user.email)}</small></div></div><div class="detail-row"><span>Account status</span><span class="status-pill">Active</span></div><a class="btn btn-outline-secondary w-100 mt-3" href="#/profile" data-route>View profile</a></section></div></div>
    <section class="mb-4"><div class="section-header"><h2 class="section-title">Quick actions</h2></div><div class="row g-2 g-md-3"><div class="col-6 col-lg-3"><a class="surface quick-action h-100" href="#/transfer" data-route><span class="action-icon">${icon("transfer")}</span><span><strong>Transfer money</strong><small>Send to an account</small></span></a></div><div class="col-6 col-lg-3"><a class="surface quick-action h-100" href="#/transactions" data-route><span class="action-icon cyan">${icon("transactions")}</span><span><strong>History</strong><small>Review transactions</small></span></a></div><div class="col-6 col-lg-3"><a class="surface quick-action h-100" href="#/loan" data-route><span class="action-icon">${icon("loan")}</span><span><strong>Request loan</strong><small>View your requests</small></span></a></div><div class="col-6 col-lg-3"><a class="surface quick-action h-100" href="#/profile" data-route><span class="action-icon cyan">${icon("profile")}</span><span><strong>Profile</strong><small>Your account details</small></span></a></div></div></section>
    <div class="row g-3"><div class="col-lg-7"><section class="surface p-3"><div class="section-header"><h2 class="section-title">Recent transactions</h2><a class="btn btn-link btn-sm" href="#/transactions" data-route>See all ${icon("chevron")}</a></div>${recentRows}</section></div><div class="col-lg-5"><section class="surface p-3 mb-3"><h2 class="section-title">Loan status</h2>${currentLoan ? `<div class="detail-row"><span>${formatMoney(currentLoan.amount)}</span><span class="status-pill ${currentLoan.status === "PENDING" ? "pending" : currentLoan.status === "REJECTED" ? "rejected" : ""}">${escapeHTML(currentLoan.status)}</span></div><small class="text-secondary">${escapeHTML(currentLoan.purpose)}</small>` : `<div class="text-secondary small">No loan requests yet. <a href="#/loan" data-route>Explore loan requests</a></div>`}</section><section class="surface p-3"><h2 class="section-title">Notifications</h2>${notices}</section></div></div>
    <p class="footnote">Stay in control. Never share your password or recovery code.</p>`;
}

export function transferPage(account) {
  return `${heading("Transfer money", "Send money to another DigiBank account.")}
    <div class="row g-3"><div class="col-lg-7"><section class="surface p-4"><div class="notice-banner mb-4">${icon("warning")}<span>Check the account number and amount carefully before sending your transfer.</span></div><form data-form="transfer" novalidate>
      <div class="mb-3"><label class="form-label" for="recipient-account">Recipient account number</label><input class="form-control" id="recipient-account" name="recipientId" inputmode="numeric" pattern="[0-9]{10}" minlength="10" maxlength="10" required><div class="form-text">Enter the recipient's 10-digit DigiBank account number.</div></div>
      <div class="mb-3"><label class="form-label" for="transfer-amount">Amount (NGN)</label><input class="form-control" id="transfer-amount" name="amount" type="number" min="1" max="100000000" step="0.01" required><div class="form-text">Available balance: ${formatMoney(account.balance)}</div></div>
      <div class="mb-3"><label class="form-label" for="transfer-description">Description</label><input class="form-control" id="transfer-description" name="description" maxlength="80" placeholder="What is this transfer for?"></div><p class="form-error" data-error></p><button class="btn btn-primary" type="submit">Send money</button>
    </form></section></div><div class="col-lg-5"><section class="surface p-4"><h2 class="section-title">Before you send</h2><div class="detail-row"><span>From account</span><strong>${escapeHTML(account.accountId)}</strong></div><div class="detail-row"><span>Available balance</span><strong>${formatMoney(account.balance)}</strong></div><div class="detail-row"><span>Transfer fee</span><strong>₦0.00</strong></div><p class="footnote mb-0">Your completed transfer will appear in your transaction history.</p></section></div></div>`;
}

export function transactionsPage(transactionList) {
  return `${heading("Transactions", "Search and review your account activity.")}
    <section class="surface p-3 mb-3"><form class="filter-bar" data-form="transaction-filter"><div><label class="form-label" for="transaction-search">Search description or reference</label><input class="form-control" id="transaction-search" name="search" maxlength="80" placeholder="Search activity"></div><div><label class="form-label" for="transaction-type">Type</label><select class="form-select" id="transaction-type" name="type"><option value="ALL">All activity</option><option value="CREDIT">Money received</option><option value="DEBIT">Transfers sent</option></select></div><button class="btn btn-outline-secondary" type="submit">Apply filters</button></form></section>
    <section class="surface"><div class="table-wrap" role="region" aria-label="Transaction history" tabindex="0"><table class="table"><thead><tr><th>Transaction</th><th>Type</th><th>Account</th><th>Amount</th><th>Status</th></tr></thead><tbody>${transactionRows(transactionList)}</tbody></table></div></section>`;
}

export function loanPage(loanList) {
  const rows = loanList.length ? loanList.map((loan) => `<div class="detail-row align-items-start"><div><strong>${formatMoney(loan.amount)}</strong><div class="text-secondary small mt-1">${escapeHTML(loan.purpose)}</div><small class="text-secondary">Requested ${formatDate(loan.createdAt)}</small>${loan.rejectionReason ? `<div class="small text-danger mt-2">Reason: ${escapeHTML(loan.rejectionReason)}</div>` : ""}</div><span class="status-pill ${loan.status === "PENDING" ? "pending" : loan.status === "REJECTED" ? "rejected" : ""}">${escapeHTML(loan.status)}</span></div>`).join("") : emptyState("You haven’t submitted a loan request.");
  return `${heading("Loans", "Apply for a loan and track your application.")}
    <div class="row g-3"><div class="col-lg-6"><section class="surface p-4"><h2 class="section-title">Request a loan</h2><p class="text-secondary small">Tell us how much you need and what you have planned. Your application will be reviewed before a decision is made.</p><form data-form="loan" novalidate><div class="mb-3"><label class="form-label" for="loan-amount">Amount (NGN)</label><input class="form-control" id="loan-amount" name="amount" type="number" min="10000" max="5000000" step="1000" required><div class="form-text">₦10,000–₦5,000,000</div></div><div class="mb-3"><label class="form-label" for="loan-purpose">Purpose</label><textarea class="form-control" id="loan-purpose" name="purpose" rows="3" minlength="8" maxlength="240" required></textarea></div><p class="form-error" data-error></p><button class="btn btn-primary" type="submit">Submit request</button></form></section></div><div class="col-lg-6"><section class="surface p-4"><h2 class="section-title">Your requests</h2>${rows}</section></div></div>`;
}

export function profilePage(user, account) {
  return `${heading("Profile", "Your personal and account information, at a glance.")}
    <div class="row g-3"><div class="col-lg-7"><section class="surface p-4"><div class="profile-row mb-4">${editableAvatar(user)}<div><strong>${escapeHTML(user.fullName)}</strong><small>Customer account</small></div></div>${profilePhotoEditor(user)}<div class="detail-row"><span>Full name</span><strong>${escapeHTML(user.fullName)}</strong></div><div class="detail-row"><span>Username</span><strong>${escapeHTML(user.username)}</strong></div><div class="detail-row"><span>Email</span><strong>${escapeHTML(user.email)}</strong></div><div class="detail-row"><span>Phone</span><strong>${escapeHTML(user.phone)}</strong></div><div class="detail-row"><span>Account number</span><strong>${escapeHTML(account.accountId)}</strong></div><div class="detail-row"><span>Balance</span><strong>${formatMoney(account.balance)}</strong></div><div class="detail-row"><span>Member since</span><strong>${formatDate(user.createdAt)}</strong></div></section></div><div class="col-lg-5"><div class="notice-banner">${icon("lock")}<span>Keep your account details private. Always log out when using a shared device.</span></div></div></div>`;
}

export function notFoundPage() {
  return `<div class="text-center py-5"><p class="eyebrow">404 · Page not found</p><h1 class="mb-3">We couldn’t find that page.</h1><a class="btn btn-primary" href="#/dashboard" data-route>Return to dashboard</a></div>`;
}
