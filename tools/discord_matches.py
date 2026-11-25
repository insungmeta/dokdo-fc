"""Discord webhook notifications for new DOKDO FC archived matches."""
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "data/dashboard.json"
STATE = ROOT / "data/discord-state.json"
CLUB_ID = 331042
TYPES = {"leagueMatch": "리그", "playoffMatch": "플레이오프", "friendlyMatch": "친선"}

def integer(value):
    try:
        return int(value)
    except (TypeError, ValueError, OverflowError):
        return None

def key(m):
    return f"{m['matchType']}:{m['matchId']}"

def valid_matches(snapshot):
    if str(snapshot.get("clubId")) != str(CLUB_ID):
        raise ValueError("Unexpected club ID")
    return {key(m): m for m in snapshot.get("matches", [])
            if isinstance(m, dict) and m.get("matchType") in TYPES
            and m.get("matchId") not in (None, "")}

def human(p):
    n = str(p.get("name") or p.get("playerName") or "").strip()
    return bool(n and (integer(p.get("playerId")) or 0) > 0
                and n.upper() not in {"AI", "CPU", "COM", "BOT", "VIRTUAL PRO AI"})

def safe_name(p):
    return str(p.get("name") or p.get("playerName") or "")[:80]

def leaders(players, field, suffix):
    eligible = [p for p in players if (integer(p.get(field)) or 0) > 0]
    eligible.sort(key=lambda p: (-integer(p[field]), safe_name(p)))
    return (", ".join(f"{safe_name(p)} {integer(p[field])}{suffix}" for p in eligible)[:1000]
            or "확인된 기록 없음")

def payload(m):
    a, b = integer(m.get("goals")), integer(m.get("goalsAgainst"))
    if a is None or b is None or a < 0 or b < 0:
        raise ValueError("Missing score")
    result, color = ("승리", 0x57F287) if a > b else ("패배", 0xED4245) if a < b else ("무승부", 0x99AAB5)
    players = [p for p in m.get("players", []) or [] if isinstance(p, dict) and human(p)]
    # Incomplete disconnect records must not be treated as valid player statistics.
    if m.get("dnf") and all(not any((integer(p.get(k)) or 0) > 0 for k in
                            ("goals", "assists", "shots", "passesMade", "tacklesMade")) for p in players):
        players = []
    fields = []
    if players:
        fields = [{"name": "⚽ 득점", "value": leaders(players, "goals", "골"), "inline": True},
                  {"name": "🎯 도움", "value": leaders(players, "assists", "도움"), "inline": True}]
        mvp = [p for p in players if (integer(p.get("manOfTheMatch")) or 0) > 0]
        if mvp:
            fields.append({"name": "⭐ MVP", "value": ", ".join(map(safe_name, mvp))[:1000], "inline": True})
        else:
            rated = []
            for p in players:
                try:
                    r = float(p.get("rating"))
                    if 0 < r <= 10:
                        rated.append((r, safe_name(p)))
                except (TypeError, ValueError):
                    pass
            if rated:
                r, n = max(rated)
                fields.append({"name": "⭐ 최고 평점", "value": f"{n} · {r:g}", "inline": True})
    else:
        fields.append({"name": "선수 기록", "value": "EA 선수별 기록 미수집", "inline": False})
    embed = {"title": f"DOKDO FC {a} : {b} {str(m.get('opponentName') or '상대팀')[:150]}",
             "description": f"**{result}** · {TYPES[m['matchType']]}" + (" · DNF" if m.get("dnf") else ""),
             "color": color, "fields": fields,
             "url": "https://insungmeta.github.io/dokdo-fc/#matches",
             "footer": {"text": "DOKDO FC · 수집된 사람 선수 기록 기준"}}
    if isinstance(m.get("timestamp"), str):
        try:
            dt = datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00"))
            if dt.tzinfo:
                embed["timestamp"] = dt.astimezone(timezone.utc).isoformat()
        except ValueError:
            pass
    return {"username": "DOKDO FC 경기 알림", "embeds": [embed], "allowed_mentions": {"parse": []}}

def webhook_url(raw):
    u = urlsplit(raw)
    if (u.scheme != "https" or u.netloc != "discord.com" or u.query or u.fragment
            or not re.fullmatch(r"/api/webhooks/[0-9]+/[A-Za-z0-9_-]+", u.path)):
        raise ValueError("Invalid Discord webhook URL format")
    return raw + "?wait=true"

def send(message, url):
    req = Request(webhook_url(url), data=json.dumps(message, ensure_ascii=False).encode(),
                  headers={"Content-Type": "application/json", "User-Agent": "DOKDO-FC-notifier/1.0"}, method="POST")
    with urlopen(req, timeout=15) as response:
        if not json.load(response).get("id"):
            raise RuntimeError("Discord did not confirm message")

def save(path, state):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)

def run(dashboard=DASHBOARD, state_path=STATE, url=None, sender=send):
    url = os.environ.get("DISCORD_WEBHOOK_URL", "").strip() if url is None else url.strip()
    if not url:
        print("Discord not configured; no messages or baseline created.")
        return 0
    webhook_url(url)
    matches = valid_matches(json.loads(dashboard.read_text(encoding="utf-8")))
    if not state_path.exists():
        save(state_path, {"clubId": CLUB_ID, "seenMatchKeys": sorted(matches)})
        print(f"Discord baseline initialized ({len(matches)} archived matches, none sent).")
        return 0
    state = json.loads(state_path.read_text(encoding="utf-8"))
    if state.get("clubId") != CLUB_ID or not isinstance(state.get("seenMatchKeys"), list):
        raise ValueError("Invalid Discord notification state")
    seen = set(state["seenMatchKeys"])
    sent = 0
    for k in sorted(set(matches) - seen, key=lambda k: (str(matches[k].get("timestamp", "")), k))[:20]:
        try:
            sender(payload(matches[k]), url)
        except HTTPError as exc:
            print(f"Discord delivery not confirmed (HTTP {exc.code}); retry on next sync.")
            break
        except (URLError, OSError, ValueError, RuntimeError):
            print("Discord delivery not confirmed; retry on next sync.")
            break
        seen.add(k)
        state["seenMatchKeys"] = sorted(seen)
        save(state_path, state)
        sent += 1
        time.sleep(0.5)
    print(f"Discord: {sent} new matches sent.")
    return sent

if __name__ == "__main__":
    run()
