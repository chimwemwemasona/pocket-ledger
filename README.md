# Pocket Ledger

Private spending journal with a self-hosted web dashboard and a native Android notification companion. Built for MTN MoMo, Airtel Money, and FNB, with a conservative, provider-independent parser.

## What it does

- Captures transaction-like notifications from explicitly selected Android apps and sender keywords; ignores OTP/login-code messages and notification group summaries.
- Queues messages encrypted with an Android Keystore AES-GCM key. HTTPS sync acknowledges each event only after a durable server commit; retries are idempotent.
- Keeps all captures in Review until you confirm the amount and direction. The parser separates likely amounts from balances and fees, and flags ambiguity and possible duplicates.
- Offers transaction notes, categories, merchant category rules, manual entries, message pasting, per-category monthly ZMW budgets, daily charts, and CSV export.
- Separates currencies, excludes own-account transfers from spending, and never presents net movement as an actual bank balance.
- Uses invite-only password access and one-time phone pairing, with individually revocable device credentials. No external AI, analytics, ad SDK, or public registration.

## Run the web app

Node 24 or newer. No npm dependencies are required.

```sh
npm test
OWNER_EMAIL=owner@example.com PUBLIC_ORIGIN=http://127.0.0.1:4192 npm start
```

On Windows, set these values as PowerShell environment variables. SQLite lives in `DATA_DIR` (default `.data`). Issue the first account invitation through a private administrative terminal:

```js
import {createApplication} from './server/index.mjs';
const app=createApplication();
console.log(app.invitation()); // Private: never put this link in public logs or Git.
app.db.close();
```

## Android

Native Java, min Android 8 (API 26), target API 35, Android Gradle Plugin 8.9.2, Gradle 8.11.1, JDK 17. The companion uses notification access for new transactions. An optional, user-initiated history import requests READ_SMS separately; it never requests accessibility access or changes the default SMS app. Its dashboard WebView is HTTPS-only, has no JavaScript native bridge, and has no file/content access.

Set `SyncJob.ORIGIN` to your own trusted HTTPS deployment. Configure your SDK in ignored `android/local.properties`. To build a signed release, keep your keystore outside Git and supply `LEDGER_KEYSTORE`, `LEDGER_STORE_PASSWORD`, and `LEDGER_KEY_PASSWORD` privately. Alias: `pocket-ledger`.

```sh
cd android
./gradlew assembleRelease
```

Keep the same signing key for updates. The keystore and its password are never committed or uploaded to the public repository. See [phone setup](docs/PHONE_SETUP.md).

## Hosting

`deploy/compose.yml` runs the application and TLS proxy separately, with read-only filesystems and an external private data volume. It is configured for the owner's Ubuntu server; adapt paths and origin for another deployment. Uses the existing renewed IP certificate, port 8446, and server-only owner email.

Required environment: `OWNER_EMAIL`, `PUBLIC_ORIGIN`, `SECURE_COOKIES=true`, `TRUST_PROXY=true`, `DATA_DIR=/data`, `PORT=3000`. Only the proxy exposes a port. Backup SQLite using the SQLite backup API, not by copying a live database without its WAL.

## Limits

Notification wording varies. No parser can guarantee correct amounts from every message. All captures require confirmation; local merchant rules help categorization but never bypass review. Fees are displayed separately for review and are **not** silently added to expense amounts. Sensitive redacted notifications, quiet SMS delivery, disabled notifications, force-stop, and manufacturer background restrictions can cause gaps. Notification access does not import historical SMS. The optional SMS history tool scans the inbox on demand, previews up to 500 financial matches per batch, and queues only selected messages. It does not access RCS, MMS, deleted SMS, or past app notifications. Phone jobs normally retry every 15 minutes when connected, and new captures also trigger immediate best-effort sync. Android decides actual background scheduling.

The phone deletes acknowledged message bodies locally, keeping event identifiers for 90 days. Rejected messages remain encrypted for attention; pending messages are retained until acknowledged. Captured and imported message bodies remain in the private server journal for review. Similar captures are flagged, not automatically deleted. Dashboard returns the latest 10,000 journal entries. CSV export uses the active period/currency/account filters and protects against spreadsheet formula injection.

Google Play Protect and newer Android versions may restrict sideloaded apps with notification access. The APK is signed, but distribution outside Google Play is not a guarantee that every phone will accept installation. Do not disable Play Protect. This build has not been validated on the owner's physical phone.

## License

MIT. Financial messages, private setup links, credentials, signing keys, and local databases are excluded from this repository.
