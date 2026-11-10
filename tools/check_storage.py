"""Non-destructive GitHub Pages and FC27 archive size checks.

No data is ever truncated. GitHub's published Pages site limit is 1 GiB
and normal Git blobs above 100 MiB are blocked by GitHub. Monitor well
before those thresholds so archives can be sharded without data loss.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIB = 1024 * 1024
SITE_LIMIT = 1024 * MIB
FILE_LIMIT = 100 * MIB


def footprint():
    return [
        p for p in ROOT.rglob("*")
        if p.is_file()
        and ".git" not in p.relative_to(ROOT).parts
        and "__pycache__" not in p.relative_to(ROOT).parts
        and ".pytest_cache" not in p.relative_to(ROOT).parts
    ]


def main():
    files = footprint()
    site_size = sum(p.stat().st_size for p in files)
    data = sorted((p for p in files if "data" in p.relative_to(ROOT).parts),
                  key=lambda p: p.stat().st_size, reverse=True)
    print(f"DFC storage: {site_size / MIB:.2f} MiB site payload, {len(files)} files.")
    for p in data:
        length = p.stat().st_size
        print(f"DFC archive: {p.relative_to(ROOT)} = {length / MIB:.2f} MiB")
        if length >= 30 * MIB:
            print(f"::warning::Archive {p.relative_to(ROOT)} is larger than 30 MiB. "
                  "Plan date-based sharding BEFORE the 100 MiB GitHub file cap. "
                  "Never delete old records.")
    if site_size >= 200 * MIB:
        print(f"::warning::Published site payload is {site_size / MIB:.2f} MiB. "
              "Plan sharded archives before the 1 GiB Pages limit.")
    if any(p.stat().st_size >= FILE_LIMIT for p in files):
        raise RuntimeError("Data file exceeds GitHub's 100 MiB per-file limit")
    if site_size >= SITE_LIMIT:
        raise RuntimeError("Site data exceeds the GitHub Pages published 1 GiB limit")


if __name__ == "__main__":
    main()
