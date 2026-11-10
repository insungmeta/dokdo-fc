"""DOKDO FC free scheduled collector.

The EA Clubs API is unofficial. Never invent player or match records.
Designed for GitHub Actions + GitHub Pages with no persistent server.
"""
from __future__ import annotations

import copy
import json
import logging
from datetime import date, datetime, timezone
from pathlib import Path

CLUB_ID = 331042
PLATFORM = "common-gen5"
MATCH_TYPES = ("leagueMatch", "friendlyMatch", "playoffMatch")
OUT = Path(__file__).resolve().parent / "data" / "dashboard.json"

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("dokdo")


def serialized(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"Cannot serialize {type(value)}")


def base():
    return {
        "clubId": CLUB_ID,
        "platform": PLATFORM,
        "club": None,
        "overall": None,
        "members": [],
        "career": [],
        "matches": [],
        "sync": {"lastAttempt": None, "lastSuccess": None, "error": None},
    }


def load(path=OUT):
    if not path.exists():
        return base()
    d = json.loads(path.read_text(encoding="utf-8"))
    if d.get("clubId") != CLUB_ID or d.get("platform") != PLATFORM:
        raise ValueError("Stored archive does not match target club — refusing to overwrite.")
    return d


def first(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return value[0] if value else None
    return None


def player(value):
    p = dict(value)
    p["name"] = p.get("name") or p.get("playerName") or p.get("personaName") or ""
    if "ratingAve" not in p:
        p["ratingAve"] = p.get("averageRating")
    if "manOfTheMatch" not in p:
        p["manOfTheMatch"] = p.get("motm")
    return p


def match(value, kind):
    v = dict(value)
    v["matchType"] = kind
    if not v.get("opponentName"):
        v["opponentName"] = v.get("opponentClubName") or v.get("opponent") or "상대팀"
    return v


def key(m):
    if m.get("matchId") not in (None, ""):
        return f"{m.get('matchType')}:{m['matchId']}"
    return (f"{m.get('matchType')}:{m.get('timestamp')}:"
            f"{m.get('opponentName')}:{m.get('goals')}:{m.get('goalsAgainst')}")


def when(m):
    val = m.get("timestamp")
    try:
        if isinstance(val, (int, float)) or (isinstance(val, str) and val.isdigit()):
            seconds = float(val)
            return seconds / 1000 if seconds > 1e12 else seconds
        if isinstance(val, datetime):
            return val.timestamp()
        return datetime.fromisoformat(str(val).replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, OverflowError):
        return 0


def merge(old, incoming):
    store = {key(m): copy.deepcopy(m) for m in old if isinstance(m, dict)}
    for m in incoming:
        row = copy.deepcopy(m)
        k = key(row)
        if k in store:
            for side in ("players", "opponentPlayers"):
                if not row.get(side) and store[k].get(side):
                    row[side] = store[k][side]
        store[k] = row
    return sorted(store.values(), key=when, reverse=True)


def collect(api_factory=None, path=OUT):
    d = load(path)
    now = datetime.now(timezone.utc).isoformat()
    sync = dict(d.get("sync") or {})
    sync["lastAttempt"] = now
    d["sync"] = sync
    errors = []
    successes = 0
    incoming = []

    try:
        if api_factory is None:
            from fc_clubs_api import FC27API
            api_factory = FC27API
        api = api_factory(platform=PLATFORM, timeout=18, timezone="Asia/Seoul", output="records")
    except Exception as exc:
        errors.append(f"API initialization: {exc}")
        api = None

    if api is not None:
        fields = [
            ("club", lambda: first(api.get_club_details(CLUB_ID))),
            ("overall", lambda: first(api.get_club_overall_stats(CLUB_ID))),
            ("members", lambda: [player(x) for x in (api.get_member_stats(CLUB_ID) or [])]),
            ("career", lambda: [player(x) for x in (api.get_member_career_stats(CLUB_ID) or [])]),
        ]
        for field, query in fields:
            try:
                response = query()
                if response is not None:
                    if field == "club":
                        response["name"] = response.get("name") or response.get("clubName") or "DOKDO FC"
                    d[field] = response
                    successes += 1
            except Exception as exc:
                errors.append(f"{field}: {exc}")
                log.warning("%s failed: %s", field, exc)

        for kind in MATCH_TYPES:
            try:
                recent = api.get_club_matches(CLUB_ID, match_type=kind, count=10)
                if recent is None:
                    raise RuntimeError("EA returned no match response")
                our_roster, opponents_roster = {}, {}
                try:
                    # EA already returns both club IDs in this match payload.
                    # Calling with both_teams avoids extra queries per opponent.
                    players = api.get_match_players(
                        CLUB_ID, match_type=kind, count=10,
                        both_teams=True, include_events=True,
                    ) or []
                    for item in players:
                        mid = item.get("matchId")
                        pid = item.get("playerId")
                        club = item.get("clubId")
                        if mid in (None, "") or pid in (None, "", 0, "0"):
                            continue
                        p = player(item)
                        if not p["name"].strip():
                            continue
                        if str(club) == str(CLUB_ID):
                            our_roster.setdefault(str(mid), []).append(p)
                        else:
                            opponents_roster.setdefault((str(mid), str(club)), []).append(p)
                except Exception as exc:
                    errors.append(f"{kind} player details: {exc}")
                for item in recent:
                    row = match(item, kind)
                    mid = str(row.get("matchId"))
                    opp = str(row.get("opponentId"))
                    row["players"] = our_roster.get(mid, [])
                    row["opponentPlayers"] = opponents_roster.get((mid, opp), [])
                    incoming.append(row)
                successes += 1
            except Exception as exc:
                errors.append(f"{kind}: {exc}")
                log.warning("%s failed: %s", kind, exc)

    d["matches"] = merge(d.get("matches") or [], incoming)
    if successes:
        sync["lastSuccess"] = now
    sync["error"] = " | ".join(errors)[:500] or None
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(d, ensure_ascii=False, indent=2, default=serialized) + "\n", encoding="utf-8")
    log.info("success=%s errors=%s matches_archived=%s", successes, len(errors), len(d["matches"]))
    return d


if __name__ == "__main__":
    collect()
