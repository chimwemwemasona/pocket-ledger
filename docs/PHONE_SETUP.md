# Install and connect your phone

1. Open your private web dashboard and activate your account using the private invitation link. Choose an app password; never enter your bank PIN.
2. Open **Phone → Download Android APK**. Install the signed APK on your Android phone. If Android asks, allow this browser to install this specific APK. Keep Play Protect enabled. If the phone blocks installation, share the exact warning so the distribution method can be adjusted.
3. Open **Phone → Pair phone** on the website. In the Android app, tap **Pair with my ledger**, then paste the full one-time code. It expires in 10 minutes.
4. Choose your SMS app (for example Google Messages or the phone's built-in Messages), plus any FNB, MTN, or Airtel apps that send transactions. Source selection starts empty.
5. Check **Sender filters**. Defaults include MTN, Airtel, FNB, and MoMo. Add the actual bank shortcode or sender label if it differs. These are comma-separated keywords, not phone permissions.
6. Open Android's notification-access settings and enable **Pocket Ledger transaction capture**. On some Android 13+ phones, sideloaded apps require **Settings → Apps → Pocket Ledger → three-dot menu → Allow restricted settings** before this can be enabled. Only enable it for this app after checking its source and signed APK. Do not turn off Play Protect.
7. Turn on **Capture transaction notifications**. Existing SMS history is not read. Keep financial notifications enabled with visible transaction content.
8. After your next real transaction, open the Android app to check the queue and sync status. Tap **Sync now** if needed. Offline captures remain encrypted until the server acknowledges them.
9. In **Review**, check the amount/direction, choose a category, and add a note. Mark transfers between your own accounts as **transfer**. Exclude duplicate bank/SMS alerts after comparing them.
10. Set category budgets. The Overview shows confirmed spending; unreviewed notifications do not change totals.

Background delays depend on your Android version and battery settings. If needed, allow background activity for Pocket Ledger in its battery settings. Never grant accessibility or banking credentials; the app does not request them. Revoke a lost phone in the web dashboard.

The Android dashboard requires internet. The native capture/settings screen and encrypted queue work offline. Notes and category edits are saved on the web server when online.

## Optional previous SMS import (0.2.0+)

In the Android capture screen, tap **Import previous transaction SMS**. Read the disclosure, select a date range (30 days, 90 days, one year, or all available history), and allow the separate SMS permission if you want to continue. Review the matched messages and deselect anything unrelated. Tap **Import selected** to encrypt and queue them. Nothing is uploaded before you confirm this selection.

Matching uses your Sender filters (MTN, Airtel, FNB, MoMo by default); add actual sender labels or shortcodes if needed. This reads SMS inbox messages only. RCS chats, MMS, deleted messages and historical banking-app notifications are not available through this import. Each batch is capped at 500 matches, scanning at most 50,000 SMS records. Repeat the import to collect later batches; already-saved history IDs are skipped.

Imported transactions preserve their original dates. In the web dashboard, select that month and open Review. A possible duplicate from an earlier live notification stays flagged for your decision. You can remove SMS permission afterward under Android Settings > Apps > Pocket Ledger > Permissions; notification capture remains separate.
