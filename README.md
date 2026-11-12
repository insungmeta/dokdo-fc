# DOKDO FC · EA SPORTS FC 27

DOKDO FC's free fan-made match & player analytics dashboard for club ID `331042` / platform `common-gen5`.

The site is hosted with **GitHub Pages**. Archived club records remain viewable, and the independent team has chosen to resume a **best-effort 5-minute automated refresh** while requesting clarification from EA. The collector uses the unofficial `fc-clubs-api` package; its open-source license does not authorize the underlying EA service. **EA permission has NOT been confirmed; continued collection may breach applicable terms, and must be stopped if EA disallows it.**

## Free hosting

This repository is public and uses GitHub's free-hosted Pages and standard GitHub Actions runners. No always-on personal computer is needed, and there is no paid hosting tier configured.

## Website

**https://insungmeta.github.io/dokdo-fc/**

The repository's GitHub Pages setting was enabled on November 10, 2026. Publication status is shown at [GitHub Actions](https://github.com/insungmeta/dokdo-fc/actions/workflows/update-and-publish.yml). If the website is unavailable, verify that **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions** and check the deployment workflow.

## Notes

- EA's unofficial endpoints can stop working or block cloud requests; live data integration is not guaranteed.
- Only the newest 10 matches of each type are available per pull. The collector archives past matches by match ID.
- Scheduled workflows may be delayed or disabled if the repo is inactive for 60 days.
- Collected public club stats are published openly. No secrets or EA password required.
- Fan project: not affiliated with or endorsed by EA.

## Legal / privacy review (November 12, 2026)

- [Independent project / copyright / EA rights notice](./legal.html) · [Privacy notice](./privacy.html) (both KO and EN).
- The website and its app concept are **not approved, endorsed or affiliated with EA or EA licensors**. DFC original branding is not an EA logo.
- EA's fan content policy **does not** grant permission to use unofficial API endpoints, scrape proprietary services or redistribute collected data. EA announced an approved FC Community API for selected partners, but this is **not** evidence of approved FC Clubs API access for DOKDO FC.
- The repository owner requested a cautious **5-minute refresh** on 2026-11-12 while waiting for EA's written response on the website and private Android app. This is a risk acceptance, **not EA authorization or a legal clearance**. To halt the unofficial collector immediately, set Actions repository variable `DFC_PAUSE_COLLECTION` to `true` (or disable the `Refresh DOKDO FC and publish` workflow). Do not use the retired `DFC_EA_DATA_LICENSE_CONFIRMED` variable as a substitute for permission.
- Previously archived stats are retained for continuity, **not** because their republication rights have been confirmed. If a player or rights holder objects, review the publication and remove affected data, including Git history/caches where feasible.
- Public gamer tags can be personal data. A private privacy-contact route and club member agreement/opt-out process are needed before broader public app distribution.
- EA-hosted opponent crest images have been removed from the active dashboard. The archived page and social banner use DFC-owned SVG artwork only; original rights to that artwork should still be confirmed by the maintainer.
- See [COMPLIANCE_REVIEW.md](./COMPLIANCE_REVIEW.md) for the unresolved release blockers. A disclaimer alone does not make unauthorized collection lawful.
