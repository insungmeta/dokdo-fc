# DOKDO FC · EA SPORTS FC 27

DOKDO FC's free fan-made match & player analytics dashboard for club ID `331042` / platform `common-gen5`.

The site is hosted with **GitHub Pages**. Archived club records remain viewable, but **new automatic EA data collection is paused pending verification of the required data-access and redistribution permissions**. The historical collector uses the unofficial `fc-clubs-api` package; its open-source license does not authorize the underlying EA service.

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
- `.github/workflows/update-and-publish.yml` is intentionally held with a **fail-closed permission gate**: the entire EA data collection job runs only if repository variable `DFC_EA_DATA_LICENSE_CONFIRMED` equals `true`. No such approval has been established in this review. Do **not** set this variable until documentary authorization actually covers FC Clubs API collection and redistribution; this is not a self-service licensing mechanism.
- Previously archived stats are retained for continuity, **not** because their republication rights have been confirmed. If a player or rights holder objects, review the publication and remove affected data, including Git history/caches where feasible.
- Public gamer tags can be personal data. A private privacy-contact route and club member agreement/opt-out process are needed before broader public app distribution.
- EA-hosted opponent crest images have been removed from the active dashboard. The archived page and social banner use DFC-owned SVG artwork only; original rights to that artwork should still be confirmed by the maintainer.
- See [COMPLIANCE_REVIEW.md](./COMPLIANCE_REVIEW.md) for the unresolved release blockers. A disclaimer alone does not make unauthorized collection lawful.
