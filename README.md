# Aubree's Learning Menu

Accessible menus for Spanish, English, Physical Sciences, U.S. History, and Culinary. Each subject has a native keyboard-accessible listbox. Select an item and use **Open selected link** (or Enter) to open it in a new tab.

Text starts at 28px, with 34px and 42px options saved on the device. Admin unlocks add, edit, and delete controls. Lock admin when finished; reloading also locks editing.

## Deployment

Frontend: https://esemmelman.github.io/aubreemenu/

Backend: Supabase project `fgomaujsdblpzxhnnqrg` (`bnaimitzvah`). This app exclusively uses `aubreemenu_items_v1`, `aubreemenu_admin_v1`, `aubreemenu_attempts_v1`, `aubreemenu_check_rate_v1`, and Edge Function `aubreemenu-api`. No other app's tables, authentication accounts, or credentials are used or modified.

The passcode is verified in the Edge Function using a salted PBKDF2-SHA256 hash with 210,000 iterations stored in the admin table. The credential and hash are not committed to this repository. The entered passcode stays in page memory and is sent over HTTPS for each admin operation. Thirty failed attempts per IP in fifteen minutes are allowed. Database tables have RLS enabled and no browser-role privileges; only the Edge Function's service role can access them. Listing is public, and every write requires the app's own passcode. The Edge Function implements custom authentication, so platform JWT verification is disabled for it.

The migration creates empty tables. When deploying to a new backend, provision a separate random salt and PBKDF2 hash in `aubreemenu_admin_v1` through trusted server tooling. Never put the plaintext passcode or service role key in frontend code or source control.

## Local development

Run `npm ci`, then `npm run dev`. The local frontend connects to the deployed backend. Run `npx playwright install chromium`, then `npm test` for browser tests using a mocked API; these do not change live data. Static hosting only needs `index.html`, `style.css`, and `app.js`.
