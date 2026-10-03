import { formatDate, formatMoney, LOAN_STATUS } from "../core/constants.js";
import { escapeHTML } from "../core/text.js";
import { icon } from "../components/icons.js";

function heading(title, subtitle) {
  return `<div class="page-heading"><div><p class="eyebrow">DigiBank administration</p><h1>${title}</h1><p class="subheading">${subtitle}</p></div></div>`;
}

export function adminDashboardPage(summary, allTransactions, userLookup) {
  // Records store user IDs instead of duplicating names everywhere. The supplied
  // lookup function resolves those IDs for display while keeping storage access
  // outside this template. Customer text still needs escaping in the admin view.
  const loans = summary.loans;
  const pending = loans.filter((loan) => loan.status === LOAN_STATUS.PENDING);
  const loanRows = pending.length ? pending.map((loan) => `<tr><td><strong>${escapeHTML(userLookup(loan.userId)?.fullName ?? "Customer")}</strong><span class="transaction-date">${escapeHTML(loan.purpose)}</span></td><td>${formatMoney(loan.amount)}</td><td>${formatDate(loan.createdAt)}</td><td><div class="d-flex gap-2 flex-wrap"><button class="btn btn-primary btn-sm" type="button" data-action="approve-loan" data-loan-id="${escapeHTML(loan.id)}">Approve</button><button class="btn btn-outline-secondary btn-sm" type="button" data-action="show-reject" data-loan-id="${escapeHTML(loan.id)}">Reject</button></div></td></tr><tr class="d-none" data-reject-row="${escapeHTML(loan.id)}"><td colspan="4"><form class="review-form" data-form="reject-loan" data-loan-id="${escapeHTML(loan.id)}"><label class="visually-hidden" for="reason-${escapeHTML(loan.id)}">Rejection reason</label><input class="form-control" id="reason-${escapeHTML(loan.id)}" name="reason" minlength="5" maxlength="180" placeholder="Reason for rejection" required><button class="btn btn-outline-secondary" type="submit">Confirm rejection</button></form></td></tr>`).join("") : `<tr><td colspan="4"><div class="empty-state">${icon("success")}<div>No pending requests to review.</div></div></td></tr>`;
  const activityRows = allTransactions.slice(0, 6).map((transaction) => `<tr><td>${escapeHTML(transaction.reference)}</td><td>${escapeHTML(transaction.accountId)}</td><td>${escapeHTML(transaction.type)}</td><td>${formatMoney(transaction.amount)}</td><td><span class="status-pill">${escapeHTML(transaction.status)}</span></td></tr>`).join("") || `<tr><td colspan="5"><div class="empty-state">No transactions yet.</div></td></tr>`;
  const notificationRows = summary.notifications.map((notification) => `<tr><td>${escapeHTML(userLookup(notification.userId)?.fullName ?? "Customer")}</td><td>${escapeHTML(notification.message)}</td><td>${formatDate(notification.createdAt)}</td></tr>`).join("") || `<tr><td colspan="3"><div class="empty-state">No customer notifications yet.</div></td></tr>`;
  const decisions = loans.filter((loan) => loan.status !== LOAN_STATUS.PENDING).length;
  return `${heading("Operations overview", "Review account activity and customer loan applications.")}
    <div class="row g-3 mb-4"><div class="col-md-4"><section class="surface p-3"><p class="eyebrow">Customers</p><strong class="fs-3">${summary.customers}</strong></section></div><div class="col-md-4"><section class="surface p-3"><p class="eyebrow">Pending requests</p><strong class="fs-3">${summary.pendingLoans}</strong></section></div><div class="col-md-4"><section class="surface p-3"><p class="eyebrow">Transactions</p><strong class="fs-3">${summary.transactions}</strong></section></div></div>
    <section class="surface mb-4"><div class="p-3 pb-0"><div class="section-header"><h2 class="section-title">Loan requests</h2><span class="status-pill neutral">${decisions} reviewed</span></div></div><div class="table-wrap" role="region" aria-label="Account operations" tabindex="0"><table class="table"><thead><tr><th>Customer and purpose</th><th>Amount</th><th>Submitted</th><th>Review</th></tr></thead><tbody>${loanRows}</tbody></table></div></section>
    <section class="surface mb-4"><div class="p-3 pb-0"><h2 class="section-title">Customer notifications</h2></div><div class="table-wrap" role="region" aria-label="Account operations" tabindex="0"><table class="table"><thead><tr><th>Customer</th><th>Message</th><th>Created</th></tr></thead><tbody>${notificationRows}</tbody></table></div></section>
    <section class="surface"><div class="p-3 pb-0"><h2 class="section-title">Transaction overview</h2></div><div class="table-wrap" role="region" aria-label="Account operations" tabindex="0"><table class="table"><thead><tr><th>Reference</th><th>Account number</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>${activityRows}</tbody></table></div></section>
    <p class="footnote">Review each application carefully and provide a clear reason when declining a request.</p>`;
}
