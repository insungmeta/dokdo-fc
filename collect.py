"""DOKDO FC free scheduled collector.

The EA Clubs API is unofficial. Never invent player or match records.
Designed for GitHub Actions + GitHub Pages with no persistent server.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
from datetime import date, datetime, timedelta, timezone
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
        "leagueAllTime": None,
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
    if any(original.get(k) for k in ("club", "league", "leagueAllTime", "overall", "members", "career", "matches")):
        history["changes"].append({
            "at": started, "kind": "preserved-baseline",
            "club": copy.deepcopy(original.get("club")),
            "league": copy.deepcopy(original.get("league")),
            "leagueAllTime": copy.deepcopy(original.get("leagueAllTime")),
            "overall": copy.deepcopy(original.get("overall")),
            "members": copy.deepcopy(original.get("members") or []),
            "career": copy.deepcopy(original.get("career") or []),
            "matches": copy.deepcopy(original.get("matches") or []),
        })
    return history_path, history


def archive_updates(original, current, history, now):
    """Append changes only when real data changes, not every 30-minute sync heartbeat."""
    changes = {"at": now, "kind": "data-change"}
    for field in ("club", "league", "leagueAllTime", "overall"):
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




def rating_trend(overall, history, now):
    """Return a real archived rating comparison without pretending we have a full week.

    History stores overall snapshots only when EA data changes. If a complete
    seven-day window exists, use the most recent observation on/before its start.
    Until then, compare against the preceding *different* recorded rating.
    """
    current = (overall or {}).get("skillRating")
    if isinstance(current, bool) or current in (None, ""):
        return None
    try:
        current = int(current)
    except (ValueError, TypeError, OverflowError):
        return None
    try:
        reference = datetime.fromisoformat(str(now).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    points = []
    for change in history.get("changes", []):
        rating = (change.get("overall") or {}).get("skillRating")
        if rating is None or rating == "" or isinstance(rating, bool):
            continue
        try:
            number = int(rating)
            stamp = datetime.fromisoformat(str(change["at"]).replace("Z", "+00:00"))
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError, OverflowError, KeyError):
            continue
        if stamp <= reference:
            points.append((stamp, number))
    if not points:
        return None
    points.sort(key=lambda x: x[0])
    cutoff = reference - timedelta(days=7)
    old_enough = [p for p in points if p[0] <= cutoff]
    if old_enough:
        baseline_at, baseline = old_enough[-1]
        period = "7d"
    else:
        different = [p for p in points if p[1] != current]
        if not different:
            return None
        baseline_at, baseline = different[-1]
        period = "previous"
    return {
        "current": current,
        "baseline": baseline,
        "delta": current - baseline,
        "period": period,
        "baselineAt": baseline_at.isoformat(),
    }


def get_verified_league(api, club_name, club_id, scope="current_season"):
    """Fetch one verified club row. Current-season and all-time are distinct.

    The season's bestDivision must never be presented as an all-time record.
    Each league response is matched by exact club ID, not name alone.
    """
    if not club_name:
        return None
    rows = api.search_club_by_name(
        str(club_name),
        scope=scope,
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
    sources = copy.deepcopy(sync.get("sources") or {})
    sync["sources"] = sources
    d["sync"] = sync
    errors = []
    successes = 0
    incoming = []

    def mark_source(source, state, issue=None):
        """Keep each endpoint's last successful observation distinct from a fresh attempt."""
        row = dict(sources.get(source) or {})
        row["lastAttempt"] = now
        if state in ("ok", "partial"):
            row["lastSuccess"] = now
        row["state"] = state
        row["error"] = str(issue)[:180] if issue else None
        sources[source] = row


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
                    mark_source(field, "ok")
                else:
                    mark_source(field, "unavailable", "EA 응답 없음")
            except Exception as exc:
                errors.append(f"{field}: {exc}")
                mark_source(field, "error", exc)
                log.warning("%s failed: %s", field, exc)

        # EA offers two DIFFERENT leaderboards. Seasonal bestDivision can
        # differ from the all-time best even when clubId is the same.
        club_name = ((d.get("club") or {}).get("name")
                     or (d.get("club") or {}).get("clubName"))
        for field, scope in (("league", "current_season"),
                             ("leagueAllTime", "all_time")):
            try:
                league = get_verified_league(api, club_name, CLUB_ID, scope=scope)
                if league is not None:
                    d[field] = _enrich(d.get(field), league)
                    successes += 1
                    mark_source(field, "ok")
                else:
                    mark_source(field, "unavailable", "해당 클럽의 리그 응답 없음")
                    log.warning("DOKDO FC %s ID %s not found in leaderboard",
                                scope, CLUB_ID)
            except Exception as exc:
                errors.append(f"{scope} division: {exc}")
                mark_source(field, "error", exc)
                log.warning("Division lookup (%s) failed: %s", scope, exc)

        for kind in MATCH_TYPES:
            try:
                recent = api.get_club_matches(CLUB_ID, match_type=kind, count=10)
                if recent is None:
                    raise RuntimeError("EA returned no match response")
                our_roster, opponents_roster = {}, {}
                details_issue = None
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
                    details_issue = str(exc)
                    errors.append(f"{kind} player details: {exc}")
                for item in recent:
                    row = match(item, kind)
                    mid = str(row.get("matchId"))
                    opp = str(row.get("opponentId"))
                    row["players"] = our_roster.get(mid, [])
                    row["opponentPlayers"] = opponents_roster.get((mid, opp), [])
                    incoming.append(row)
                successes += 1
                mark_source(kind, "partial" if details_issue else "ok", details_issue)
            except Exception as exc:
                errors.append(f"{kind}: {exc}")
                mark_source(kind, "error", exc)
                log.warning("%s failed: %s", kind, exc)

    if api is None:
        for field in ("club", "overall", "members", "career",
                      "league", "leagueAllTime", *MATCH_TYPES):
            mark_source(field, "error", "EA API 연결 실패")
    d["matches"] = merge(d.get("matches") or [], incoming)
    if successes:
        sync["lastSuccess"] = now
    sync["error"] = " | ".join(errors)[:500] or None
    tracked = ("club", "overall", "league", "leagueAllTime", "members", "matches")
    canonical = json.dumps({k: d.get(k) for k in tracked},
                           ensure_ascii=False, sort_keys=True, separators=(",", ":"),
                           default=serialized)
    sync["revision"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]

    # Keep a permanent, append-only revision log of all team, season, career,
    # per-player and both-sides match details. Old data is never deleted.
    archive_updates(original, d, history, now)
    d["ratingTrend"] = rating_trend(d.get("overall"), history, now)
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
    # Small, independently polled heartbeat: no need to download the multi-MB archive.
    status = {
        "schemaVersion": 1, "clubId": CLUB_ID, "checkedAt": now,
        "lastSuccess": sync.get("lastSuccess"), "revision": sync["revision"],
        "sources": sources, "partial": bool(errors) or any(
            item.get("state") != "ok" for item in sources.values()
        ),
    }
    (path.parent / "status.json").write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    log.info(
        "success=%s errors=%s matches_archived=%s history_revisions=%s",
        successes, len(errors), len(d["matches"]), len(history["changes"]),
    )
    return d


if __name__ == "__main__":
    collect()
