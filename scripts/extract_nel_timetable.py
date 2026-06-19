from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import pdfplumber


TIME_RE = re.compile(r"\b(?:\d{1,2}:\d{2}:\d{2}|24:\d{2}:\d{2})\b")
SERVICE_RE = re.compile(r"^\d{3}$")
SCHEDULE_RE = re.compile(r"^\d{4}$")
STATION_RE = re.compile(r"^[A-Z0-9']+")


def clean_cell(value: Any) -> str:
    return " ".join(str(value or "").replace("\n", " ").split())


def get_direction(page_text: str) -> str:
    search_area = page_text[:600]

    if "Northbound" in search_area:
        return "NB"
    if "Southbound" in search_area:
        return "SB"

    return ""


def get_station_code(value: str) -> str:
    match = STATION_RE.match(value.replace(".", ""))

    return match.group(0) if match else ""


def get_notes(value: str) -> list[str]:
    if not value or value == ".......":
        return []

    return [note.strip() for note in re.split(r"\s{2,}|\|", value) if note.strip() and note.strip() != "......."]


def infer_event_kinds(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    station_counts: dict[str, int] = {}
    station_seen: dict[str, int] = {}

    for event in events:
        station_counts[event["station"]] = station_counts.get(event["station"], 0) + 1

    normalized = []

    for event in events:
        station = event["station"]
        station_seen[station] = station_seen.get(station, 0) + 1
        call_index = station_seen[station]
        call_count = station_counts[station]
        kind = "pass"

        if call_count > 1:
            kind = "arrive" if call_index % 2 == 1 else "depart"
        elif call_index == 1:
            kind = "time"

        normalized.append({
            **event,
            "kind": kind,
            "stationCallIndex": call_index,
        })

    return normalized


def extract_timetable(pdf_path: Path) -> dict[str, Any]:
    services: list[dict[str, Any]] = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            direction = get_direction(page_text)

            if not direction:
                continue

            tables = page.extract_tables()

            if not tables:
                continue

            table = max(tables, key=len)

            if len(table) < 3:
                continue

            service_row = [clean_cell(cell) for cell in table[0]]
            schedule_row = [clean_cell(cell) for cell in table[1]]
            note_row = [clean_cell(cell) for cell in table[2]]

            for column_index, service_no in enumerate(service_row[1:], start=1):
                if not SERVICE_RE.fullmatch(service_no):
                    continue

                schedule_no = schedule_row[column_index] if column_index < len(schedule_row) else ""

                if not SCHEDULE_RE.fullmatch(schedule_no):
                    continue

                events: list[dict[str, Any]] = []

                for row_index, row in enumerate(table[3:], start=1):
                    station = get_station_code(clean_cell(row[0] if row else ""))

                    if not station or column_index >= len(row):
                        continue

                    times = TIME_RE.findall(clean_cell(row[column_index]))

                    for time in times:
                        events.append({
                            "station": station,
                            "time": time,
                            "rowIndex": row_index,
                        })

                services.append({
                    "direction": direction,
                    "events": infer_event_kinds(events),
                    "notes": get_notes(note_row[column_index] if column_index < len(note_row) else ""),
                    "page": page.page_number,
                    "scheduleNo": schedule_no,
                    "serviceNo": service_no,
                })

    return {
        "source": {
            "file": str(pdf_path),
            "title": "NEL_OTES_Weekday_03",
            "effectiveFrom": "2025-07-14",
        },
        "services": services,
        "summary": {
            "serviceColumns": len(services),
            "uniqueScheduleNumbers": len({service["scheduleNo"] for service in services}),
            "uniqueServiceNumbers": len({service["serviceNo"] for service in services}),
        },
    }


def get_station_call(events: list[dict[str, Any]], station: str) -> dict[str, str]:
    calls = [event for event in events if event["station"] == station]

    if not calls:
        return {"point": "", "time": "", "arrive": "", "depart": "", "dwell": ""}

    arrive = next((event["time"] for event in calls if event["kind"] == "arrive"), calls[0]["time"])
    depart = next((event["time"] for event in calls if event["kind"] == "depart"), arrive)

    return {
        "point": station,
        "time": depart,
        "arrive": arrive,
        "depart": depart,
        "dwell": get_time_delta(arrive, depart),
    }


def get_time_seconds(value: str) -> int:
    hour, minute, second = [int(part) for part in value.split(":")]

    return hour * 3600 + minute * 60 + second


def format_duration(seconds: int) -> str:
    if seconds <= 0:
        return ""

    minute, second = divmod(seconds, 60)

    return f"{minute}:{second:02d}"


def get_time_delta(start: str, end: str) -> str:
    if not start or not end:
        return ""

    delta = get_time_seconds(end) - get_time_seconds(start)

    return format_duration(delta)


def get_compact_services(data: dict[str, Any], selected_station: str) -> list[dict[str, Any]]:
    compact_services = []

    for service in data["services"]:
        events = service["events"]

        if not events:
            continue

        origin = events[0]
        destination = events[-1]
        selected = get_station_call(events, selected_station)
        selected_point = selected["point"] or origin["station"]
        selected_time = selected["time"] or origin["time"]
        compact_services.append({
            "destinationPoint": destination["station"],
            "destinationTime": destination["time"],
            "direction": service["direction"],
            "dwell": selected["dwell"],
            "notes": service["notes"],
            "originPoint": origin["station"],
            "originTime": origin["time"],
            "page": service["page"],
            "run": service["direction"],
            "scheduleNo": service["scheduleNo"],
            "selectedStation": selected_station,
            "stationPoint": selected_point,
            "stationTime": selected_time,
            "serviceNo": service["serviceNo"],
        })

    return compact_services


def write_compact_ts(data: dict[str, Any], output: Path, selected_station: str) -> None:
    compact_services = get_compact_services(data, selected_station)
    serialized = json.dumps(compact_services, indent=2)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "\n".join([
            "export type NelTimetableService = {",
            "  destinationPoint: string",
            "  destinationTime: string",
            "  direction: 'NB' | 'SB'",
            "  dwell: string",
            "  notes: readonly string[]",
            "  originPoint: string",
            "  originTime: string",
            "  page: number",
            "  run: 'NB' | 'SB'",
            "  scheduleNo: string",
            "  selectedStation: string",
            "  serviceNo: string",
            "  stationPoint: string",
            "  stationTime: string",
            "}",
            "",
            "export const nelOtesWeekday03Services = (",
            serialized,
            ") as const satisfies readonly NelTimetableService[]",
            "",
        ]),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract NEL OTES weekday timetable PDF into JSON.")
    parser.add_argument("pdf", type=Path, help="Path to NEL_OTES_Weekday_03 PDF")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("tmp/timetable/nel_otes_weekday_03.json"),
        help="Output JSON path",
    )
    parser.add_argument(
        "--compact-ts-output",
        type=Path,
        help="Optional compact TypeScript output path for frontend use",
    )
    parser.add_argument(
        "--selected-station",
        default="SKG",
        help="Station to use for selected-station timetable row summaries",
    )
    args = parser.parse_args()

    data = extract_timetable(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if args.compact_ts_output:
        write_compact_ts(data, args.compact_ts_output, args.selected_station)
    print(json.dumps(data["summary"], indent=2))
    print(f"wrote {args.output}")
    if args.compact_ts_output:
        print(f"wrote {args.compact_ts_output}")


if __name__ == "__main__":
    main()
