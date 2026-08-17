# HTFD Dashboard deployment checklist

## Before the next release

1. Rotate the Firebase admin password that previously appeared in the reference Apps Script source.
2. In the dispatch Google Apps Script project, open **Project Settings → Script properties** and add:
   - `FIREBASE_ADMIN_EMAIL`
   - `FIREBASE_ADMIN_PASSWORD`
3. Deploy the complete web root so `assets/`, `vendor/`, and `deptadmin/vendor/` are available beside the HTML files.
4. Run `pnpm assets` and `pnpm check` before publishing.
5. Build with `pnpm build:local` for a non-publishing installer test, then use `pnpm build` for the release.

`GHTOKEN.txt`, `appscript.gs`, both admin sources, build scripts, and tests are explicitly excluded from the Electron installer.

## Firebase security rules

The browser UI is not a security boundary. Firestore rules must require an authenticated administrator for writes. Assign an `admin: true` Firebase custom claim to authorized accounts and use a rule equivalent to:

```text
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
```

Use `isAdmin()` for writes to `config`, `slides`, `ticker`, `layout_settings`, `unitStatus`, `dailyTasks`, `addressNotes`, `maintenance`, and administrative alert documents. The reviewed deployable rules are in `firestore.rules`; `firebase.json` and `.firebaserc` point the Firebase CLI at project `db2-2f64c`. Assign the custom claim to the admin account, then run `firebase deploy --only firestore:rules` before publishing the updated admin.

## Firestore news feed

News posts are stored directly in the Firestore `news` collection. The kiosk has public read access, while create, update, and delete operations require an authenticated user with the `admin: true` custom claim. Deploy `firestore.rules` before publishing the updated administrator interface. The legacy Google Sheets Apps Script endpoint is no longer used.

## Kiosk controls

- `Ctrl+Shift+M`: enter or leave maintenance mode.
- `Ctrl+Shift+Q`: close the kiosk.
- Set `HTFD_DISPLAY_ID` before launch to override the persisted monitor selection.

Updates download in the background and install on the next planned app exit instead of interrupting an active display.
