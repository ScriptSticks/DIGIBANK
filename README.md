# DigiBank

DigiBank is a fictional digital banking frontend for learning about frontend architecture, clear application flows, and responsible security boundaries. It is not connected to a bank, payment provider, or backend service. **DigiBank is fictional educational software and must not be treated as production banking software.**

The application deliberately models a secure baseline rather than introducing insecure examples. Frontend checks improve the demo experience, but browser code and browser storage are controlled by the person using the browser. This project does not provide real authentication, authorization, transaction integrity, fraud controls, or credential protection.

## Technology

- HTML5 and CSS3
- Vanilla JavaScript ES modules
- Bootstrap 5.3 for layout and form primitives
- Browser local storage for fictional account, transaction, loan, and notification records

No frontend framework, backend server, API, database, or real financial integration is used.

## Run Locally

Serve this folder with any static web server. ES modules do not work reliably from a `file://` URL.

- In VS Code, use a static-server extension such as Live Server and open `index.html` with it.
- Or use an already-installed static file server, for example `npx http-server .` or `python -m http.server 8000`, then open the local URL it prints.

Bootstrap and the optional DM Sans / Manrope fonts are loaded from CDNs, so those visual dependencies need internet access. Core layout and functionality remain ordinary HTML, CSS, and JavaScript files.

## Project Structure

```text
index.html                 Document shell and module entry point
styles.css                 DigiBank design tokens, components, responsive rules
src/
  main.js                  Route table, screen composition, and browser events
  core/
    constants.js           Shared statuses, currency, and opening balance
    mock-storage.js        Seed data and browser persistence
    router.js              Hash navigation and user-experience route guards
    state-manager.js       Current in-memory identity and change notification
    text.js                Escaping for untrusted text rendered in templates
  components/
    icons.js               Small consistent inline SVG icon set
    layout.js              Shared desktop sidebar, header, and mobile navigation
  data/
    repositories.js        Data access for users, accounts, and activity
  pages/
    public-pages.js        Welcome, signup, login, and recovery screens
    banking-pages.js       Customer dashboard and banking workflows
    admin-pages.js         Fictional administrative review workspace
  services/
    services.js            Authentication demo, banking, and admin workflows
```

## Architecture

The pages render UI and collect input. Services normalize and validate input and apply the demo's business rules. Repositories isolate reads and writes from the services. `MockStorage` persists only fictional business records in the browser. This keeps a later repository replacement possible without tying page code to local storage.

The Router uses the URL hash (for example `#/dashboard`) so the app can run from a static server without server-side URL rewrite configuration. It checks whether a page should be shown to a signed-in customer or administrator to guide navigation. Those checks are not an authorization boundary.

`StateManager` keeps the signed-in user ID in memory. Credentials, the recovery code, and the active session are not saved in local storage. As a result, reloading signs out and a newly registered account's password is forgotten; seed demo credentials work again after reload. This limitation is deliberate and avoids presenting browser storage as safe credential persistence.

## Demo Accounts

Customer demo: `amina@digibank.test` / `DigiBankDemo!2026`  
Administrator demo: `admin@digibank.test` / `DigiBankAdmin!2026`

These fictional development credentials are intentionally hardcoded and visible in the frontend. They are convenience values for local exploration only, not secrets or security controls, and must never be reused for real accounts. Administrator entry is at `#/admin/login`; role checks and route separation guide the UI only. Only a trusted backend can enforce real authentication and authorization. Accounts created through signup can use the login form until the page is reloaded; their passwords remain in memory and are not persisted.

## Opening Balance and Mock Data

`DEFAULT_STARTING_BALANCE` in `src/core/constants.js` is the single source for the **₦250,000.00** starting balance. New customer accounts receive that amount internally and the dashboard displays it. The signup success screen shows the generated 10-digit account number. Seed data uses the same balance.

Fictional user, account, transaction, loan, and notification records are stored under the `digibank.mock-data.v1` local-storage key. To reset them, press **Alt+R** while the app is open, or remove that key in the browser's developer tools and reload. Reset restores the fictional demo customer and administrator. This does not contact or affect any real financial system.

## Secure Frontend Practices and Limits

- User-controlled text is escaped before it is placed in HTML templates; toast messages use `textContent`.
- Forms use visible labels, semantic input types, browser constraints, normalization, and service-level validation.
- Passwords and one-time recovery codes remain in JavaScript memory for the current page session; they are not persisted. The recovery code is shown on screen because this is a local flow simulation, not email delivery.
- Mock role checks and transaction calculations are useful for learning UI flows only. A user can inspect or modify client-side code and local data.
- A future trusted backend must independently authenticate users, authorize every operation, validate input, protect credentials, prevent replay and duplicate decisions, apply atomic transaction rules, and store auditable records. No backend technology or API style is selected by this frontend project.

Do not enter real personal, account, password, or financial information.