import { Router } from "./core/router.js";
import { StateManager } from "./core/state-manager.js";
import { applyTheme, setTheme } from "./core/theme.js";
import { downloadPhoto, preparePhoto } from "./core/profile-photo.js";
import { DEFAULT_STARTING_BALANCE, USER_ROLE } from "./core/constants.js";
import { AccountRepository, TransactionRepository, UserRepository } from "./data/repositories.js";
import { AdminService, AuthService, BankingService, resetMockData } from "./services/services.js";
import { renderShell } from "./components/layout.js";
import { adminDashboardPage } from "./pages/admin-pages.js";
import { dashboardPage, loanPage, notFoundPage, profilePage, transactionsPage, transferPage } from "./pages/banking-pages.js";
import { forgotPasswordPage, loginPage, otpPage, resetPasswordPage, signupPage, signupSuccessPage, welcomePage } from "./pages/public-pages.js";

const state = new StateManager();
const auth = new AuthService(state);
const banking = new BankingService();
const administration = new AdminService();
const users = new UserRepository();
const accounts = new AccountRepository();
const transactions = new TransactionRepository();
const appRoot = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
let recoveryEmail = "";
let recoveryCode = "";
let createdAccount = null;
let balanceVisible = true;
let transactionFilter = { search: "", type: "ALL" };
let photoRequest = null;

function showToast(message, kind = "success") {
  const toast = document.createElement("div");
  toast.className = `toast-message${kind === "error" ? " error" : ""}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function getVisibleTransactions(userId) {
  const normalizedSearch = transactionFilter.search.trim().toLowerCase();
  return banking.getTransactions(userId).filter((transaction) => {
    const matchesType = transactionFilter.type === "ALL" || transaction.type === transactionFilter.type;
    const searchableText = `${transaction.description} ${transaction.reference} ${transaction.counterpartyAccountId}`.toLowerCase();
    return matchesType && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });
}

function renderPage(pageName, { path, currentUser }) {
  // Navigation or a session change cancels any in-flight photo update.
  photoRequest?.abort();
  photoRequest = null;
  let content;
  if (pageName === "welcome") content = welcomePage();
  else if (pageName === "login") content = loginPage(false);
  else if (pageName === "adminLogin") content = loginPage(true);
  else if (pageName === "signup") content = signupPage();
  else if (pageName === "signupSuccess") content = signupSuccessPage(createdAccount ?? { accountId: "Unavailable" });
  else if (pageName === "forgotPassword") content = forgotPasswordPage();
  else if (pageName === "otp") content = otpPage(recoveryEmail, recoveryCode);
  else if (pageName === "resetPassword") content = resetPasswordPage(recoveryEmail, recoveryCode);
  else if (pageName === "notFound") content = notFoundPage();
  else if (pageName === "adminDashboard") {
    const allTransactions = transactions.all().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    content = adminDashboardPage(administration.getSummary(), allTransactions, (userId) => users.findById(userId));
  } else if (currentUser) {
    const account = banking.getAccount(currentUser.id) ?? { accountId: "Unavailable", balance: DEFAULT_STARTING_BALANCE };
    if (pageName === "dashboard") content = dashboardPage({ user: currentUser, account, transactions: banking.getTransactions(currentUser.id), loans: banking.getLoans(currentUser.id), notifications: banking.getNotifications(currentUser.id) });
    else if (pageName === "transfer") content = transferPage(account);
    else if (pageName === "transactions") content = transactionsPage(getVisibleTransactions(currentUser.id));
    else if (pageName === "loan") content = loanPage(banking.getLoans(currentUser.id));
    else if (pageName === "profile") content = profilePage(currentUser, account);
  }
  if (currentUser) {
    appRoot.innerHTML = renderShell(content ?? notFoundPage(), { currentUser, activePath: path, logoutPath: currentUser.role === USER_ROLE.ADMIN ? "/admin/login" : "/login" });
  } else {
    appRoot.innerHTML = pageName === "welcome" ? content : `<main id="app-main" tabindex="-1">${content ?? notFoundPage()}</main>`;
  }
  applyTheme(Boolean(currentUser));
  if (pageName === "transactions") {
    const search = appRoot.querySelector("#transaction-search");
    const type = appRoot.querySelector("#transaction-type");
    if (search) search.value = transactionFilter.search;
    if (type) type.value = transactionFilter.type;
  }
  document.title = `${pageTitle(pageName)} | DigiBank`;
}

function pageTitle(pageName) {
  return ({ welcome: "Welcome", login: "Log in", adminLogin: "Administrator log in", signup: "Create account", signupSuccess: "Account created", forgotPassword: "Password recovery", otp: "Verify code", resetPassword: "Reset password", dashboard: "Dashboard", transfer: "Transfer", transactions: "Transactions", loan: "Loans", profile: "Profile", adminDashboard: "Administration", notFound: "Page not found" })[pageName] ?? "DigiBank";
}

const routes = {
  "/": { page: "welcome" },
  "/signup": { page: "signup" },
  "/signup/success": { page: "signupSuccess", auth: true, customer: true },
  "/login": { page: "login" },
  "/forgot-password": { page: "forgotPassword" },
  "/otp": { page: "otp" },
  "/reset-password": { page: "resetPassword" },
  "/dashboard": { page: "dashboard", auth: true, customer: true },
  "/profile": { page: "profile", auth: true, customer: true },
  "/transfer": { page: "transfer", auth: true, customer: true },
  "/transactions": { page: "transactions", auth: true, customer: true },
  "/loan": { page: "loan", auth: true, customer: true },
  "/admin/login": { page: "adminLogin", admin: true },
  "/admin": { page: "adminDashboard", admin: true, auth: true },
};

const router = new Router({
  routes,
  render: renderPage,
  getCurrentUser: () => state.getCurrentUserId(),
  getUserById: (id) => users.findById(id),
});

state.subscribe(() => router.resolve());

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormError(form, message) {
  const errorElement = form.querySelector("[data-error]");
  if (errorElement) errorElement.textContent = message;
}

function validateForm(form) {
  if (form.dataset.form === "signup") {
    const values = formValues(form);
    const confirmation = form.elements.namedItem("confirmPassword");
    confirmation.setCustomValidity(values.password === values.confirmPassword ? "" : "Passwords do not match.");
  }
  if (form.dataset.form === "reset-password") {
    const values = formValues(form);
    form.elements.namedItem("confirmPassword").setCustomValidity(values.password === values.confirmPassword ? "" : "Passwords do not match.");
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }
  return true;
}

async function handleFormSubmit(form) {
  const formType = form.dataset.form;
  if (formType.startsWith("profile-photo-")) {
    await handlePhotoSubmit(form);
    return;
  }
  if (formType === "transaction-filter") {
    const values = formValues(form);
    transactionFilter = { search: values.search ?? "", type: values.type ?? "ALL" };
    router.resolve();
    return;
  }
  if (!validateForm(form)) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Please wait…";
  }
  setFormError(form, "");
  await Promise.resolve();
  try {
    const values = formValues(form);
    if (formType === "login") {
      const user = auth.login(values.email, values.password, form.dataset.admin === "true" ? USER_ROLE.ADMIN : USER_ROLE.CUSTOMER);
      showToast(`Welcome back, ${user.fullName.split(" ")[0]}.`);
      router.navigateTo(user.role === USER_ROLE.ADMIN ? "/admin" : "/dashboard");
    } else if (formType === "signup") {
      createdAccount = auth.signup(values).account;
      router.navigateTo("/signup/success");
    } else if (formType === "forgot") {
      const result = auth.requestPasswordReset(values.email);
      recoveryEmail = result.email;
      recoveryCode = result.demoCode ?? "";
      router.navigateTo("/otp");
      if (!result.demoCode) showToast("Check your account email address and enter your recovery code to continue.");
    } else if (formType === "otp") {
      recoveryEmail = auth.verifyRecoveryCode(values.email, values.code);
      recoveryCode = values.code;
      router.navigateTo("/reset-password");
    } else if (formType === "reset-password") {
      auth.resetPassword(values.email, values.code, values.password);
      recoveryCode = "";
      showToast("Your password has been updated.");
      router.navigateTo("/login");
    } else if (formType === "transfer") {
      const currentUser = auth.getCurrentUser();
      const result = banking.transfer(currentUser.id, values.recipientId, values.amount, values.description);
      showToast(`Transfer complete. Reference: ${result.reference}`);
      router.navigateTo("/transactions");
    } else if (formType === "loan") {
      banking.requestLoan(auth.getCurrentUser().id, values.amount, values.purpose);
      showToast("Your loan application has been submitted.");
      router.resolve();
    } else if (formType === "reject-loan") {
      administration.reviewLoan(auth.getCurrentUser(), form.dataset.loanId, "REJECTED", values.reason);
      showToast("Loan request rejected and customer notified.");
      router.resolve();
    }
  } catch (error) {
    setFormError(form, error instanceof Error ? error.message : "We could not complete that request. Please try again.");
  } finally {
    if (submitButton?.isConnected) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function handlePhotoSubmit(form) {
  if (photoRequest || !validateForm(form)) return;
  const userId = auth.getCurrentUser()?.id;
  if (!userId) return;
  const request = new AbortController();
  photoRequest = request;
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 15000);
  const controls = [...appRoot.querySelectorAll("[data-photo-controls]")];
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  // Read fields before disabling them; disabled inputs are omitted from FormData.
  const values = formValues(form);
  controls.forEach((fieldset) => { fieldset.disabled = true; });
  button.textContent = "Saving photo…";
  form.setAttribute("aria-busy", "true");
  setFormError(form, "");
  try {
    let photo = null;
    if (form.dataset.form !== "profile-photo-remove") {
      const blob = form.dataset.form === "profile-photo-url" ? await downloadPhoto(values.photoUrl.trim(), request.signal) : values.photo;
      photo = await preparePhoto(blob, request.signal);
    }
    request.signal.throwIfAborted();
    if (!form.isConnected || auth.getCurrentUser()?.id !== userId) return;
    auth.updateProfilePhoto(photo);
    router.resolve();
    document.querySelector("#profile-photo-file")?.focus();
    showToast(photo ? "Profile photo saved." : "Profile photo removed.");
  } catch (error) {
    if (form.isConnected && (!request.signal.aborted || timedOut)) {
      setFormError(form, timedOut ? "The image took too long to load. Try another URL or upload it from your device." : error instanceof Error ? error.message : "Could not save this photo. Please try again.");
    }
  } finally {
    window.clearTimeout(timeout);
    if (photoRequest === request) photoRequest = null;
    controls.forEach((fieldset) => { fieldset.disabled = false; });
    button.textContent = label;
    form.removeAttribute("aria-busy");
  }
}

// Broken or tampered stored images fall back to the initials underneath.
appRoot.addEventListener("error", (event) => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains("avatar-photo")) event.target.remove();
}, true);

appRoot.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  handleFormSubmit(form);
});

appRoot.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const actionName = action.dataset.action;
  if (actionName === "set-theme") {
    setTheme(action.dataset.theme);
  } else if (actionName === "logout") {
    auth.logout();
    router.navigateTo(action.dataset.logoutPath || "/");
  } else if (actionName === "toggle-password") {
    const input = action.parentElement.querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    action.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
  } else if (actionName === "continue-dashboard") {
    router.navigateTo("/dashboard");
  } else if (actionName === "toggle-balance") {
    const balance = appRoot.querySelector("[data-balance]");
    const currentUser = auth.getCurrentUser();
    balanceVisible = !balanceVisible;
    balance.textContent = balanceVisible ? (banking.getAccount(currentUser.id)?.balance ?? DEFAULT_STARTING_BALANCE).toLocaleString("en-NG", { style: "currency", currency: "NGN" }) : "₦ ••••••";
    action.setAttribute("aria-label", balanceVisible ? "Hide balance" : "Show balance");
  } else if (actionName === "copy-account") {
    const accountId = banking.getAccount(auth.getCurrentUser().id)?.accountId;
    try {
      await navigator.clipboard.writeText(accountId);
      showToast("Account number copied.");
    } catch {
      showToast(`Account number: ${accountId}`);
    }
  } else if (actionName === "approve-loan") {
    try {
      administration.reviewLoan(auth.getCurrentUser(), action.dataset.loanId, "APPROVED");
      showToast("Loan request approved and customer notified.");
      router.resolve();
    } catch (error) {
      showToast(error.message, "error");
    }
  } else if (actionName === "show-reject") {
    const row = appRoot.querySelector(`[data-reject-row="${CSS.escape(action.dataset.loanId)}"]`);
    row?.classList.toggle("d-none");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.altKey && event.key.toLowerCase() === "r") {
    resetMockData();
    auth.logout();
    window.location.hash = "#/";
    showToast("Account data has been reset.");
  }
});

router.resolve();
