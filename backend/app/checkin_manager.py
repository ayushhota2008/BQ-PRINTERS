import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import settings

CHECKIN_FILE_PATH = Path(__file__).resolve().parent.parent / "data" / "shop_checkins.json"

class CheckInManager:
    @staticmethod
    def _ensure_dir():
        CHECKIN_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def load_checkins() -> dict[str, Any]:
        """Loads all check-ins keyed by date (YYYY-MM-DD)."""
        CheckInManager._ensure_dir()
        if not CHECKIN_FILE_PATH.exists():
            return {}
        try:
            with open(CHECKIN_FILE_PATH, encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, OSError):
            return {}

    @staticmethod
    def save_checkin(
        checkin_dict: dict[str, Any],
        overwrite_confirmed: bool = False
    ) -> tuple[bool, dict[str, Any], str]:
        """
        Saves or updates a check-in record.
        Returns: (success, record, status_code_or_message)
        """
        CheckInManager._ensure_dir()
        date_str = checkin_dict.get("checkin_date") or datetime.now().strftime("%Y-%m-%d")

        # Validate staff_present
        staff_present = checkin_dict.get("staff_present", settings.DEFAULT_STAFF_COUNT)
        if not isinstance(staff_present, int) or staff_present < 0 or staff_present > settings.MAX_STAFF_COUNT:
            return False, {}, f"Staff count must be an integer between 0 and {settings.MAX_STAFF_COUNT}."

        # Validate working_printers
        printer_issue = bool(checkin_dict.get("printer_issue", False))
        working_printers = checkin_dict.get("working_printers", "all")
        if printer_issue:
            if working_printers not in ("hp_only", "canon_only", "none"):
                working_printers = "hp_only"
        else:
            working_printers = "all"

        all_checkins = CheckInManager.load_checkins()

        if date_str in all_checkins and not overwrite_confirmed:
            return False, all_checkins[date_str], "EXISTS_CONFIRMATION_REQUIRED"

        record = {
            "checkin_date": date_str,
            "staff_present": staff_present,
            "printer_issue": printer_issue,
            "working_printers": working_printers,
            "notes": checkin_dict.get("notes", ""),
            "timestamp": datetime.now().isoformat()
        }

        all_checkins[date_str] = record

        try:
            with open(CHECKIN_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(all_checkins, f, indent=2, ensure_ascii=False)
            return True, record, "SAVED"
        except OSError as e:
            return False, {}, f"Failed to persist check-in: {e!s}"

    @staticmethod
    def get_checkin(date_str: str) -> dict[str, Any] | None:
        all_checkins = CheckInManager.load_checkins()
        return all_checkins.get(date_str)

    @staticmethod
    def list_checkins() -> list[dict[str, Any]]:
        all_checkins = CheckInManager.load_checkins()
        # Sort by checkin_date descending
        items = list(all_checkins.values())
        items.sort(key=lambda x: x.get("checkin_date", ""), reverse=True)
        return items

    @staticmethod
    def match_checkins_for_dates(
        day_names: list[str],
        primary_checkin: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Matches check-ins against dataset day names or dates.
        If a date has no check-in, uses defaults and flags missing dates.
        """
        all_checkins = CheckInManager.load_checkins()
        daily_statuses = []
        missing_dates = []

        # If primary_checkin was supplied in this request, use it as current check-in
        curr_staff = primary_checkin.get("staff_present", settings.DEFAULT_STAFF_COUNT) if primary_checkin else settings.DEFAULT_STAFF_COUNT
        curr_printers = primary_checkin.get("working_printers", "all") if primary_checkin else "all"

        for d_name in day_names:
            if d_name in all_checkins:
                c = all_checkins[d_name]
                daily_statuses.append(c)
            else:
                missing_dates.append(d_name)
                daily_statuses.append({
                    "checkin_date": d_name,
                    "staff_present": curr_staff,
                    "working_printers": curr_printers,
                    "printer_issue": curr_printers != "all",
                    "is_default": primary_checkin is None
                })

        has_missing = len(missing_dates) > 0
        note = None
        if has_missing:
            note = f"Default values used for these dates: {', '.join(missing_dates)}"

        return {
            "daily_statuses": daily_statuses,
            "missing_dates": missing_dates,
            "default_note": note
        }

