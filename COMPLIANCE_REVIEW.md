# DOKDO FC — rights, privacy and Google Play release review

Review date: 2026-11-12 (KST). This is an engineering risk review, not a legal opinion or confirmation of licensing.

## Required before the public Android release

1. **EA data access and redistribution permission — unresolved / high.** The repository previously called undocumented EA Clubs endpoints through the unofficial MIT-licensed `fc-clubs-api` library. The library's MIT license covers the client's code only, not EA's backend data or authorization to collect and republish it. EA User Agreement and Content Policy restrict unauthorized access/extraction. EA's July 2026 official Community API announcement concerned selected approved sites and initially Ultimate Team account data; it does not certify this Clubs feed. Obtain permission covering the actual endpoints, automated collection frequency, archived/season stats and public re-use, or replace with a licensed or voluntarily supplied source. The scheduled collector is **held** until permission is documented; restore only with repository variable `DFC_EA_DATA_LICENSE_CONFIRMED=true` after verification.
2. **Gamer tags and privacy rights — unresolved / high.** Team and opponent pseudonyms, performance and disciplinary records could identify people. Confirm member permissions, set up an accessible private contact and a way to suppress/remove archived data and Git history as reasonably possible. The current data is publicly committed to Git and may have been cloned; hiding a webpage is not full deletion.
3. **Developer identity and privacy contact — unresolved / medium.** Google Play requires a published, accurate privacy policy and contact mechanism. The site publishes bilingual privacy.html and legal.html, but the operator must provide a functioning private email or equivalent personal-data contact before Play submission. Do not submit placeholder details.
4. **DFC crest and banner ownership — confirm / medium.** These SVG files are self-contained club artwork in this repository, not EA logos. Confirm creator permission/rights and uniqueness. Never copy EA FC logos, game art, players' portraits, branded opponent crests or stadium screenshots without permission.
5. **App metadata and privacy/Data safety — confirm / medium.** Publish as `DOKDO FC`, independent fan statistics, without official-EA framing. Do not claim direct EA partnership or live authorised feed. Declare any third-party requests, analytics, cookies, board login and notifications accurately. Native app should ask only for INTERNET; no location, contacts, media, microphone or device identifiers.

## Changes applied to the current website

- Added persistent non-affiliation and rights-review wording, plus accessible bilingual legal and privacy pages linked from the home and archived pages.
- Removed hot-linked EA/opponent emblems from the current dashboard, replacing them with generated neutral initials.
- Removed the game trademark from the DFC-designed social banner and main home/app manifest titles.
- Marked the site as using an archived snapshot while new unofficial EA collection is paused.
- Made the GitHub Actions EA collection **fail closed** using a repository permission variable; previously collected data was not destroyed or edited.
- Documented GitHub Pages hosting, GitHub issue board, third-party fonts on archived page, disabled OneSignal configuration, retention and requests to review gamer-tag exposure.

## Must not claim

- That an independent DFC disclaimer grants the right to collect or republish EA data.
- That the official EA FC Community API authorizes Pro Clubs access, absent written proof.
- That HTTPS, Play Protect or a free app guarantees there are zero legal or security risks.
- That consent of one team owner automatically covers every teammate or opposing player's personally identifiable information.
- That stopping new data collection clears all already-published or previously-cloned archived statistics.

## External references

- [EA Content Policy](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/)
- [EA User Agreement](https://www.ea.com/legal/user-agreement)
- [EA FC Community API announcement (July 2026)](https://www.ea.com/games/ea-sports-fc/news/pitch-notes-fc26-community-api-update)
- [Python unofficial API package](https://pypi.org/project/fc-clubs-api/)
- [Google Play User Data & Privacy Policy](https://support.google.com/googleplay/android-developer/answer/10144311)

## Follow-up ownership tasks

- Contact EA about permission in writing or replace the data source with explicitly licensed data. Do not turn the collector back on until then.
- Ask club members about their public gamer tags; provide a private support email and process deletion/opt-out cases.
- Verify ownership of DFC SVG illustrations and any user-contributed text/images.
- Audit Google Play policy and create a signed Android App Bundle only after rights, support contact and data declarations are complete.
