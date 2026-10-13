# Pocket Ledger: Play Protect review packet

The reported warning is:

> App blocked to protect your device. This app can request access to sensitive data. This can increase the risk of identity theft or financial fraud.

Google documents this warning for apps downloaded through internet sideloading sources that declare sensitive capabilities, including notification access. A valid APK signature does not exempt an app from this restriction. This packet requests a review; it does not guarantee Google will allow installation.

Official explanation: https://developers.google.com/android/play-protect/warning-dev-guidance

Official appeal form: https://support.google.com/googleplay/android-developer/contact/protectappeals

## Form values

- Email address: use your own email address in the form; do not publish it here.
- Developer name: Chimwemwe Masona
- Application package: `com.masona.pocketledger`
- APK SHA-256: `ec1f187d546cc7ee202283508789a81b21868d88aa7892753e1ab6138cdff1da`
- Signing certificate SHA-256: `a5f533cfafe2f8b335201ecaae6d26a33b8223741cf9e9f5625f5bb531627bc3`
- APK: https://github.com/chimwemwemasona/pocket-ledger/releases/download/v0.1.0/pocket-ledger-0.1.0.apk
- Source: https://github.com/chimwemwemasona/pocket-ledger/tree/be248ac

The current appeal form asks for the hash of the APK **uploaded to VirusTotal**. Upload the public release APK above at https://www.virustotal.com/gui/home/upload first. Do not upload any private databases, signing keys, invitations, financial messages, or Google credentials. Confirm the resulting APK SHA-256 matches the value above. The public binary contains no transaction history or account password.

## Additional information — ready to paste

I am the developer of Pocket Ledger, package com.masona.pocketledger, an open-source personal spending journal with an Android notification companion and a private, self-hosted web dashboard.

My own device blocks the signed 0.1.0 release with the sensitive-data / identity-theft or financial-fraud warning. Please review this APK's classification and notification-access use case.

Notification access supports the app's visible primary function: collecting the user's own bank/mobile-money transaction notifications to build a spending journal. Capture is off by default. The user chooses source apps and sender keywords, explicitly enables notification access in Android settings, and separately turns on transaction capture in the app. Transaction-like notifications are filtered locally; OTP and login-code messages are skipped. The app does not suppress, cancel, reply to, or modify other apps' notifications.

The app does not request READ_SMS, RECEIVE_SMS, SEND_SMS, accessibility access, contacts, location, overlay access, or device-administrator privileges. It does not read historical SMS, invoke banking actions, request banking PINs, or extract notification actions or PendingIntents. It does not load executable code dynamically and has no advertising or analytics SDK.

Selected transaction messages are encrypted locally using Android Keystore AES-GCM, then sent over HTTPS to the owner's server after a one-time account-controlled pairing step. Device credentials can be revoked. Capture can be switched off. Locally acknowledged message bodies are removed from the phone. Captures require review before affecting spending totals. Original message content is retained in the private server journal for the user's own review and notes. No messages are sent to an external AI service.

The release is signed with the developer's RSA-3072 key. APK signature verification and Android lint passed. The source and exact APK are publicly available at the URLs supplied above. These checks are supplied as build evidence, not as a substitute for Google's security review.

## Submission status and alternatives

This appeal has **not** been submitted. The app's owner must complete the form or explicitly authorize submission. Google's form currently says decisions are final and a response is not provided; do not assume a guaranteed response time or approval.

A signed Android App Bundle has also been built locally at `android/app/build/outputs/bundle/release/app-release.aab` for future Google Play distribution. AAB files cannot be installed directly on a phone. Google Play internal distribution requires a developer account and appropriate app/tester setup; approval is not guaranteed.

Until installation is resolved, the hosted web dashboard remains usable for pasted transaction messages, notes, budgets, and manual entries. A web app alone cannot capture other apps' Android notifications. Keep Play Protect enabled. Do not rename/repackage the app, remove disclosure, or change signing keys to evade the block.
