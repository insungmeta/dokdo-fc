"""Render a 1200x630 social-share image for KakaoTalk Open Graph cards.

SVG is the canonical, editable club artwork. GitHub Actions generates a
publicly accessible PNG; no external image hosting or paid service required.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "club-banner.svg"
TARGET = ROOT / "assets" / "og-dokdo-fc.png"

if __name__ == "__main__":
    import cairosvg
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(SOURCE), write_to=str(TARGET),
                    output_width=1200, output_height=630)
    print(f"OpenGraph PNG created: {TARGET.name} ({TARGET.stat().st_size} bytes)")
