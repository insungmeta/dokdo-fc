# DOKDO FC · EA SPORTS FC 27

DOKDO FC's free fan-made match & player analytics dashboard for club ID `331042` / platform `common-gen5`.

The site is hosted with **GitHub Pages**, with match and player data refreshed automatically by **GitHub Actions** using the community-built, unofficial `fc-clubs-api` package.

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
