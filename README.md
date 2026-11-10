# DOKDO FC · EA SPORTS FC 27

DOKDO FC's free fan-made match & player analytics dashboard for club ID `331042` / platform `common-gen5`.

The site is deployed to **GitHub Pages** and its data is refreshed automatically by **GitHub Actions** using the community-built, unofficial `fc-clubs-api` package.

## Free hosting

This repository is public and uses GitHub's free-hosted Pages and standard GitHub Actions runners. No always-on personal computer is needed, and there is no paid hosting tier configured.

## Activation

In repository **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions** once. Open **Actions** to view the first deployment. The expected site address after successful deployment is `https://insungmeta.github.io/dokdo-fc/`.

## Notes

- EA's unofficial endpoints can stop working or block cloud requests; live data integration is not guaranteed.
- Only the newest 10 matches of each type are available per pull. The collector archives past matches by match ID.
- Scheduled workflows may be delayed or disabled if the repo is inactive for 60 days.
- Collected public club stats are published openly. No secrets or EA password required.
- Fan project: not affiliated with or endorsed by EA.
