"""Publish one OneSignal web push per newly archived FC27 league match.

Safe by default:
- No API call until OneSignal is enabled and credentials are available.
- First run records the existing baseline instead of alerting old matches.
- Already seen matches are never announced twice.
- No player/device tokens or API keys are saved to the public repository.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "data" / "dashboard.json"
STATE = ROOT / "data" / "push-state.json"
CONFIG = ROOT / "push" / "config.json"
CLUB_ID = 331042
TARGET_URL = "https://insungmeta.github.io/dokdo-fc/#matches"
API_URL = "https://api.onesignal.com/notifications"
log = logging.getLogger("dfc-push")


def match_key(match):
    return f"{match.get('matchType', '')}:{match.get('matchId', '')}"


def matches_by_key(snapshot):
    result = {}
    for match in snapshot.get("matches", []):
        if not isinstance(match, dict) or match.get("matchType") != "leagueMatch":
            continue
        if match.get("matchId") is None:
            continue
        result[match_key(match)] = match
    return result


def _player_name(player):
    return str(player.get("name") or player.get("playerName") or "선수")[:24]


def _leader_lines(players, field, suffix, limit=2):
    qualifying = sorted(
        (p for p in players if isinstance(p, dict) and int(p.get(field) or 0) > 0),
        key=lambda p: (-int(p.get(field) or 0), _player_name(p)),
    )[:limit]
    return ", ".join(f"{_player_name(p)} {int(p[field])}{suffix}" for p in qualifying)


def build_notification(match, app_id):
    our_goals = int(match.get("goals") or 0)
    opponent_goals = int(match.get("goalsAgainst") or 0)
    result = "승리" if our_goals > opponent_goals else "패배" if our_goals < opponent_goals else "무승부"
    opponent = str(match.get("opponentName") or "상대팀")[:35]
    players = [p for p in match.get("players", []) if isinstance(p, dict)]
    sections = [result]
    scorers = _leader_lines(players, "goals", "골")
    assists = _leader_lines(players, "assists", "도움")
    if scorers:
        sections.append("⚽ " + scorers)
    if assists:
        sections.append("🎯 " + assists)
    mvp = [p for p in players if int(p.get("manOfTheMatch") or 0) > 0]
    if mvp:
        sections.append("⭐ MVP " + _player_name(mvp[0]))
    elif players:
        rated = [p for p in players if p.get("rating") is not None]
        if rated:
            best = max(rated, key=lambda p: float(p["rating"]))
            sections.append("⭐ 최고평점 " + _player_name(best) + " " + str(best["rating"]))
    gks = [p for p in players if p.get("position") == "goalkeeper" and int(p.get("saves") or 0) > 0]
    if gks:
        sections.append("🧤 " + _leader_lines(gks, "saves", "선방", 1))

    title = f"⚽ DOKDO FC {our_goals} : {opponent_goals} {opponent}"
    body = " · ".join(sections)[:240]
    key = match_key(match)
    return {
        "app_id": app_id,
        "target_channel": "push",
        "included_segments": ["Subscribed Users"],
        "headings": {"en": title, "ko": title},
        "contents": {"en": body, "ko": body},
        "url": TARGET_URL,
        "name": "DFC league match " + key,
        "idempotency_key": str(uuid.uuid5(uuid.NAMESPACE_URL, "dokdo-fc:" + key)),
    }


def _is_recent(match, now):
    stamp = match.get("timestamp")
    if not isinstance(stamp, str):
        return False
    try:
        parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and now - timedelta(hours=48) <= parsed.astimezone(timezone.utc) <= now + timedelta(minutes=10)


def send_push(payload, api_key):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(API_URL, data=data, headers={
        "Authorization": "Key " + api_key,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
    }, method="POST")
    with urlopen(req, timeout=20) as res:
        response = json.load(res)
    if response.get("id"):
        return response["id"]
    error = str(response.get("errors") or "")
    if "not subscribed" in error.lower() or "no subscribed" in error.lower():
        log.info("No subscribed devices; match was recorded without sending.")
        return None
    raise RuntimeError("OneSignal did not accept notification: " + error[:200])


def save_state(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(snapshot_path=DASHBOARD, state_path=STATE, config_path=CONFIG, now=None, sender=send_push):
    now = now or datetime.now(timezone.utc)
    snapshot = json.loads(Path(snapshot_path).read_text(encoding="utf-8"))
    if snapshot.get("clubId") != CLUB_ID:
        raise ValueError("Push snapshot has unexpected club ID.")
    current = matches_by_key(snapshot)
    if Path(state_path).exists():
        state = json.loads(Path(state_path).read_text(encoding="utf-8"))
        if state.get("clubId") != CLUB_ID or not isinstance(state.get("seenMatchKeys"), list):
            raise ValueError("Push state belongs to another club or is malformed.")
    else:
        state = {"schemaVersion": 1, "clubId": CLUB_ID, "initializedAt": now.isoformat(),
                 "seenMatchKeys": sorted(current)}
        save_state(Path(state_path), state)
        log.info("Initialized push baseline: %s league matches (none sent)", len(current))
        return 0

    seen = set(state["seenMatchKeys"])
    new_keys = sorted((key for key in current if key not in seen),
                      key=lambda key: (str(current[key].get("timestamp", "")), key))
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    app_id = os.environ.get("ONESIGNAL_APP_ID", "").strip()
    api_key = os.environ.get("ONESIGNAL_REST_API_KEY", "").strip()
    active = (config.get("enabled") is True
              and app_id and app_id == config.get("appId") and api_key)
    count = 0
    for key in new_keys:
        match = current[key]
        if active and _is_recent(match, now):
            try:
                sender(build_notification(match, app_id), api_key)
            except (HTTPError, URLError, OSError, ValueError, RuntimeError) as exc:
                log.error("Push failed for %s; will retry next sync: %s", key, exc)
                continue
            count += 1
        seen.add(key)
    if seen != set(state["seenMatchKeys"]):
        state["seenMatchKeys"] = sorted(seen)
        state["lastProcessedAt"] = now.isoformat()
        save_state(Path(state_path), state)
    log.info("OneSignal %s; %s new league matches, %s alerts sent",
             "enabled" if active else "not connected", len(new_keys), count)
    return count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run()
