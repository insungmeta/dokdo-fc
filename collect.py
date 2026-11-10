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
        "league": None,
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


def _has_value(v):
    """A missing value must never erase a previously captured nonempty value."""
    return v is not None and v != "" and v != [] and v != {}


def _enrich(old, incoming):
    """Update supplied values, retaining richer historical fields on partial responses."""
    merged = copy.deepcopy(old or {})
    for field, val in (incoming or {}).items():
        if _has_value(val) or field not in merged:
            merged[field] = copy.deepcopy(val)
    return merged


def _member_key(p):
    """Some EA member endpoints omit playerId; fall back to stable displayed name."""
    player_id = p.get("playerId")
    if player_id not in (None, "", 0, "0"):
        return "id:" + str(player_id)
    name = str(p.get("name") or p.get("playerName") or "").strip().casefold()
    return "name:" + name if name else None


def merge_members(old, incoming):
    """Never drop former players or discard fields during temporary API omissions."""
    result = []
    locations = {}
    for item in list(old or []) + list(incoming or []):
        if not isinstance(item, dict):
            continue
        who = _member_key(item)
        if who is None:
            if item not in result:
                result.append(copy.deepcopy(item))
        elif who in locations:
            i = locations[who]
            result[i] = _enrich(result[i], item)
        else:
            locations[who] = len(result)
            result.append(copy.deepcopy(item))
    return result


def _player_key(p):
    pid = p.get("playerId")
    club = p.get("clubId")
    if pid not in (None, "", 0, "0"):
        return str(club) + ":" + str(pid)
    return str(club) + ":name:" + str(p.get("name", "")).strip().casefold()


def _merge_roster(old, new):
    result = []
    locations = {}
    for p in list(old or []) + list(new or []):
        if not isinstance(p, dict):
            continue
        ident = _player_key(p)
        if ident in locations:
            i = locations[ident]
            result[i] = _enrich(result[i], p)
        else:
            locations[ident] = len(result)
            result.append(copy.deepcopy(p))
    return result


def merge(old, incoming):
    """Append all unique matches forever; enrich rather than replace earlier details."""
    store = {key(m): copy.deepcopy(m) for m in old if isinstance(m, dict)}
    for m in incoming:
        if not isinstance(m, dict):
            continue
        k = key(m)
        previous = store.get(k, {})
        row = _enrich(previous, m)
        for side in ("players", "opponentPlayers"):
            if side in previous or side in m:
                row[side] = _merge_roster(previous.get(side), m.get(side))
        store[k] = row
    return sorted(store.values(), key=when, reverse=True)


def _same(old, new):
    """Compare saved JSON values, not transient Python datetime objects.

    EA records return timestamp as datetime but our files contain ISO strings.
    A plain Python comparison wrongly archived all 10 games every single poll.
    Canonical JSON prevents phantom revisions and unbounded false duplicates.
    """
    def normalize(value):
        return json.dumps(
            value, ensure_ascii=False, default=serialized,
            sort_keys=True, separators=(",", ":"),
        )
    return normalize(old) == normalize(new)


def _diff_members(old, new):
    old_map = {_member_key(p): p for p in old or [] if isinstance(p, dict)}
    return [copy.deepcopy(p) for p in new or []
            if isinstance(p, dict) and not _same(old_map.get(_member_key(p)), p)]


def _diff_matches(old, new):
    old_map = {key(m): m for m in old or [] if isinstance(m, dict)}
    return [copy.deepcopy(m) for m in new or []
            if isinstance(m, dict) and not _same(old_map.get(key(m)), m)]


def load_history(path, original, now):
    """Bootstrap from already archived matches/player stats; fail closed if archive lost."""
    history_path = path.parent / "history.json"
    if history_path.exists():
        history = json.loads(history_path.read_text(encoding="utf-8"))
        if history.get("clubId") != CLUB_ID or history.get("platform") != PLATFORM:
            raise ValueError("History archive belongs to a different club.")
        if not isinstance(history.get("changes"), list):
            raise ValueError("History archive is incomplete; refusing to overwrite.")
        return history_path, history
    if original.get("archiveVersion"):
        raise FileNotFoundError("Historical stat file is missing; refusing to reset archive.")
    started = (original.get("sync") or {}).get("lastSuccess") or now
    history = {
        "schemaVersion": 1,
        "clubId": CLUB_ID,
        "platform": PLATFORM,
        "startedAt": started,
        "changes": [],
    }
    if any(original.get(k) for k in ("club", "league", "overall", "members", "career", "matches")):
        history["changes"].append({
            "at": started, "kind": "preserved-baseline",
            "club": copy.deepcopy(original.get("club")),
            "league": copy.deepcopy(original.get("league")),
            "overall": copy.deepcopy(original.get("overall")),
            "members": copy.deepcopy(original.get("members") or []),
            "career": copy.deepcopy(original.get("career") or []),
            "matches": copy.deepcopy(original.get("matches") or []),
        })
    return history_path, history


def archive_updates(original, current, history, now):
    """Append changes only when real data changes, not every 30-minute sync heartbeat."""
    changes = {"at": now, "kind": "data-change"}
    for field in ("club", "league", "overall"):
        if not _same(original.get(field), current.get(field)):
            changes[field] = copy.deepcopy(current.get(field))
    for field in ("members", "career"):
        delta = _diff_members(original.get(field), current.get(field))
        if delta:
            changes[field] = delta
    match_updates = _diff_matches(original.get("matches"), current.get("matches"))
    if match_updates:
        changes["matches"] = match_updates
    if len(changes) > 2:
        history["changes"].append(changes)
    # Snapshot history is append-only; old changes are never removed or capped.
    return history



def get_verified_league(api, club_name, club_id):
    """Use FC27 leaderboard currentDivision; never assume a club name is unique."""
    if not club_name:
        return None
    rows = api.search_club_by_name(
        str(club_name),
        scope="current_season",
        max_result_count=100,
    ) or []
    for item in rows:
        if not isinstance(item, dict) or str(item.get("clubId")) != str(club_id):
            continue
        league = copy.deepcopy(item)
        raw = league.get("currentDivision")
        # EA uses 1-6, possibly no data. Never invent a division number.
        try:
            number = int(raw)
        except (TypeError, ValueError):
            number = None
        league["currentDivision"] = number if number is not None and 1 <= number <= 6 else None
        return league
    return None


def collect(api_factory=None, path=OUT):
    d = load(path)
    original = copy.deepcopy(d)
    now = datetime.now(timezone.utc).isoformat()
    history_path, history = load_history(path, original, now)
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
                    if field in ("members", "career"):
                        d[field] = merge_members(d.get(field), response)
                    else:
                        d[field] = _enrich(d.get(field), response)
                    successes += 1
            except Exception as exc:
                errors.append(f"{field}: {exc}")
                log.warning("%s failed: %s", field, exc)

        # The clubs/info and clubs/overallStats endpoints do not include
        # currentDivision. FC27's currentSeasonLeaderboard/search does.
        try:
            league = get_verified_league(
                api, (d.get("club") or {}).get("name") or (d.get("club") or {}).get("clubName"),
                CLUB_ID,
            )
            if league is not None:
                d["league"] = _enrich(d.get("league"), league)
                successes += 1
            else:
                log.warning("DOKDO FC ID %s was not in the season leaderboard response", CLUB_ID)
        except Exception as exc:
            errors.append(f"current division: {exc}")
            log.warning("Current division lookup failed: %s", exc)

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

    # Keep a permanent, append-only revision log of all team, season, career,
    # per-player and both-sides match details. Old data is never deleted.
    archive_updates(original, d, history, now)
    d["archiveVersion"] = 1

    path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(
        json.dumps(history, ensure_ascii=False, indent=2, default=serialized) + "\n",
        encoding="utf-8",
    )
    path.write_text(
        json.dumps(d, ensure_ascii=False, indent=2, default=serialized) + "\n",
        encoding="utf-8",
    )
    log.info(
        "success=%s errors=%s matches_archived=%s history_revisions=%s",
        successes, len(errors), len(d["matches"]), len(history["changes"]),
    )
    return d


if __name__ == "__main__":
    collect()
