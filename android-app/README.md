# DOKDO FC — Android / Google Play preparation

**Status: Android Studio source project implemented; Play publication is ON HOLD pending rights clearance.**

This package is an independent fan-made DOKDO FC website companion, not affiliated with or endorsed by EA or its licensors. It does not request EA login credentials or access the EA game.

## Build

- Open the `android-app/` folder as a Gradle project in Android Studio.
- Java 17 or newer, Android SDK 36, Android Gradle Plugin 8.13.2 and Gradle 8.13.
- If you have Gradle installed, run `gradle -p android-app :app:assembleDebug` from the repository root. The GitHub Android-build workflow also validates that the app compiles; it does NOT release the app.
- Package / application ID: `io.github.insungmeta.dokdofc` (choose carefully before the first Play submission).
- Android minimum API: 26; target API: 36, compliant with the August 2026 new-app target API requirement at the time this project was prepared.
- The app uses Android's WebView to display `https://insungmeta.github.io/dokdo-fc/`. It has its own loading/error screen and opens non-DFC external links in the system browser.
- Uses **INTERNET only**. No personal contacts, location, camera, microphone, storage, SMS, notifications or ad SDKs; no JavaScript bridge.
- TLS errors fail closed. No HTTP/cleartext, no file/content access, no third-party cookies, no backup of app data.

## Before uploading to Google Play

1. **EA data rights (BLOCKER):** the website historically uses an unofficial FC Clubs API. A public fan-site statement or the package's MIT license does not grant EA data collection/republication rights. New automated collection is paused until written permission is verified; app release must await this, or the source must be replaced with properly licensed/team-volunteered data. See `../COMPLIANCE_REVIEW.md`.
2. **Privacy and gamer tags (BLOCKER):** resolve public gamer tag retention, objections, data deletion and permissions. Provide a legitimate private operator privacy contact. Public GitHub issues must never request sensitive identity evidence.
3. **Store account:** the owner signs in at https://play.google.com/console/signup and pays Google's one-time US$25 registration fee with an accepted payment card. Complete identity/address verification according to Play Console instructions.
4. **App signing:** use Android Studio > Build > Generate Signed Bundle / APK > Android App Bundle. Generate and safeguard your own upload keystore, never commit or share `.jks` or private passwords. The source repository intentionally has **no release signing key**.
5. **Testing:** test navigation, offline errors, English/KO switch, privacy & rights links, GitHub external links, buttons and accessibility on actual Android devices. Newly created individual Play developer accounts may need 12 opted-in testers for 14 continuous days before production access.
6. **Play listing:** obtain the right to use the DOKDO FC name and artwork; create original 512px icon, feature graphic and genuine screenshots (avoid EA branding/game imagery). Do not describe the app as official EA, affiliated or licensed.
7. **Play Data safety and privacy:** link `https://insungmeta.github.io/dokdo-fc/privacy.html` as the privacy policy and make it available inside the app through the website footer. Declare real web/hosting/third-party data handling, including the GitHub board and older page's Google Fonts requests. The published privacy notice must include the developer's verified private support contact before release.
8. **Business status:** fan/non-commercial. Selling access or implying EA endorsement is prohibited or unverified. Review Google Play's current WebView/functionality and impersonation policy.

## No silent publication

Building this project or paying Google's fee does not authorize EA API access, licensed match data, team/gamer tag redistribution, or any third-party logos. A signed App Bundle and Play Store submission require the owner's account, release keystore and final legal/privacy approvals.

References:
- https://help.ea.com/en/articles/security-and-rules/ea-content-policy/
- https://www.ea.com/legal/user-agreement
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/18265346
