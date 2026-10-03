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

After login, the shared header provides Light and Dark theme controls for both customer and administrator pages. The choice is saved under `digibank.theme` in local storage and restored at the next login. If storage is unavailable, the choice lasts for the current page session. Public and login screens use the light theme.

The pages render UI and collect input. Services normalize and validate input and apply the demo's business rules. Repositories isolate reads and writes from the services. `MockStorage` persists only fictional business records in the browser. This keeps a later repository replacement possible without tying page code to local storage.

The Router uses the URL hash (for example `#/dashboard`) so the app can run from a static server without server-side URL rewrite configuration. It checks whether a page should be shown to a signed-in customer or administrator to guide navigation. Those checks are not an authorization boundary.

`StateManager` keeps the signed-in user ID in memory. Credentials, the recovery code, and the active session are not saved in local storage. As a result, reloading signs out and a newly registered account's password is forgotten; seed demo credentials work again after reload. This limitation is deliberate and avoids presenting browser storage as safe credential persistence.

## Reading the Code

Start with `index.html`, then `src/main.js` to follow startup, routing, rendering, and event handling. Next read `src/core/router.js`, a file in `src/pages/`, `src/services/services.js`, and `src/data/repositories.js` to trace a user action from the screen to storage. Comments explain why the layers are separated, how asynchronous work is cancelled, where HTML needs escaping, and which protections are only part of this frontend demo. For the photo flow, follow `src/components/profile-photo-editor.js` through the handlers in `main.js` to `src/core/profile-photo.js`.

## Demo Accounts

Customer demo: `amina@digibank.test` / `DigiBankDemo!2026`  
Administrator demo: `admin@digibank.test` / `DigiBankAdmin!2026`

These fictional development credentials are intentionally hardcoded and visible in the frontend. They are convenience values for local exploration only, not secrets or security controls, and must never be reused for real accounts. Administrator entry is at `#/admin/login`; role checks and route separation guide the UI only. Only a trusted backend can enforce real authentication and authorization. Accounts created through signup can use the login form until the page is reloaded; their passwords remain in memory and are not persisted.

## Opening Balance and Mock Data

`DEFAULT_STARTING_BALANCE` in `src/core/constants.js` is the single source for the **₦250,000.00** starting balance. New customer accounts receive that amount internally and the dashboard displays it. The signup success screen shows the generated 10-digit account number. Seed data uses the same balance.

Fictional user, account, transaction, loan, and notification records are stored under the `digibank.mock-data.v1` local-storage key. To reset them, press **Alt+R** while the app is open, or remove that key in the browser's developer tools and reload. Reset restores the fictional demo customer and administrator. This does not contact or affect any real financial system.

## Secure Frontend Practices and Limits

### Profile photos

On Profile, customers click the pencil icon on their avatar to choose Upload from computer or Upload from URL. Only the selected form opens, inside the existing profile card. Escape or Cancel closes the editor; clicking outside the source chooser dismisses it. Customers can also remove their photo to restore initials. The same photo appears on the dashboard. JPEG, PNG, and WebP inputs are limited to 8 MiB, 20 million pixels, and 8,192 pixels per side. Input signatures, declared MIME types, dimensions, and browser decoding are checked. SVG, HTML, GIF, and animated WebP inputs are rejected. Accepted images are center-cropped and re-encoded as a 256 × 256 JPEG, discarding original metadata and embedded extra content. A fixed circular avatar uses `object-fit: cover` and cannot grow with the source image.

URL imports require CORS permission from the image host. They omit credentials and referrers, reject redirects, block non-HTTPS schemes, embedded credentials, custom ports, IP literals, and common local hostname suffixes, cap streamed response bytes, and time out after 15 seconds. The URL host is contacted only when importing; the original URL is not saved or used for ongoing avatar display. Browser-side hostname checks cannot verify the public IP behind a DNS name. There is no server-side fetch proxy in this project.

Only bounded JPEG data URLs are rendered, attributes are escaped, and failed image loads fall back to initials without inline event handlers. Navigation or logout cancels an in-flight update. Photos are saved to the current fictional customer's browser record; storage failures leave the previous photo intact and show an error. This remains a frontend demo: production uploads require independent authenticated server-side validation, image processing, storage limits, and network controls for URL imports. See [OWASP's file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Run the photo regression checks with Node.js 20 or newer: `node tests/run-profile-photo.mjs`. They cover validation, bounded downloads, crop calculations, rendering safety, persistence failures, and session changes with browser API test doubles; they do not replace browser visual testing.

### Other frontend practices

- User-controlled text is escaped before it is placed in HTML templates; toast messages use `textContent`.
- Forms use visible labels, semantic input types, browser constraints, normalization, and service-level validation.
- Passwords and one-time recovery codes remain in JavaScript memory for the current page session; they are not persisted. The recovery code is shown on screen because this is a local flow simulation, not email delivery.
- Mock role checks and transaction calculations are useful for learning UI flows only. A user can inspect or modify client-side code and local data.
- A future trusted backend must independently authenticate users, authorize every operation, validate input, protect credentials, prevent replay and duplicate decisions, apply atomic transaction rules, and store auditable records. No backend technology or API style is selected by this frontend project.

Do not enter real personal, account, password, or financial information.
