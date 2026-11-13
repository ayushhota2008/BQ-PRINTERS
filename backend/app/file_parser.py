import csv
import io
import re
from typing import Any

import numpy as np
import openpyxl

REQUIRED_SERVICES = [
    "B&W Printing",
    "Colour Printing",
    "Binding",
    "Photocopying"
]

DEFAULT_WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

REQUIRED_COLUMNS = [
    "Day",
    "Service",
    "9 AM–11 AM",
    "11 AM–1 PM",
    "1 PM–4 PM",
    "4 PM–6 PM"
]

REQUIRED_CORE_COLUMNS = [
    "Service",
    "9 AM–11 AM",
    "11 AM–1 PM",
    "1 PM–4 PM",
    "4 PM–6 PM"
]

TIME_COLS = ["9 AM–11 AM", "11 AM–1 PM", "1 PM–4 PM", "4 PM–6 PM"]

class UploadValidationError(Exception):
    def __init__(self, error_code: str, message: str, details: list[dict[str, Any]] | None = None, status_code: int = 422):
        self.error_code = error_code
        self.message = message
        self.details = details or []
        self.status_code = status_code
        super().__init__(message)

def normalize_column_name(col_val: Any) -> str:
    if col_val is None:
        return ""
    cleaned = re.sub(r'\s+', ' ', str(col_val).strip())
    c_lower = cleaned.lower()
    if re.search(r'\bday\b|\bdays\b', c_lower) and not re.search(r'\d', c_lower):
        return "Day"
    elif "serv" in c_lower:
        return "Service"
    elif "9" in c_lower and "11" in c_lower:
        return "9 AM–11 AM"
    elif "11" in c_lower and "1" in c_lower:
        return "11 AM–1 PM"
    elif "1" in c_lower and "4" in c_lower:
        return "1 PM–4 PM"
    elif "4" in c_lower and "6" in c_lower:
        return "4 PM–6 PM"
    return cleaned

def is_day_header(val: Any) -> bool:
    if val is None:
        return False
    s = str(val).strip()
    return bool(re.match(r'^(day\s*[-–_]?\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', s, re.IGNORECASE))

def normalize_service_name(serv_val: Any) -> str | None:
    if serv_val is None:
        return None
    cleaned = re.sub(r'[^a-zA-Z]', '', str(serv_val)).lower()
    s_lower = str(serv_val).lower()
    if "bw" in cleaned or "black" in cleaned or "b&w" in s_lower:
        return "B&W Printing"
    elif "col" in cleaned:
        return "Colour Printing"
    elif "bind" in cleaned:
        return "Binding"
    elif "photo" in cleaned or "copy" in cleaned or "xerox" in cleaned:
        return "Photocopying"
    return None

def parse_uploaded_file(
    filename: str,
    contents: bytes,
    max_file_size: int = 5 * 1024 * 1024,
    max_rows: int = 500,
    max_cols: int = 50
) -> dict[str, Any]:
    """
    Unified validation and parsing pipeline for CSV and Excel (.xlsx) workbooks.
    Works directly on raw bytes to guarantee data integrity without corrupted character decodes.
    Returns validated matrices, observations, structured records, warnings, and metadata.
    """
    if not contents or len(contents) == 0:
        raise UploadValidationError("EMPTY_FILE", "The uploaded file is empty.", status_code=400)

    if len(contents) > max_file_size:
        max_mb = max_file_size // (1024 * 1024)
        curr_mb = len(contents) / (1024 * 1024)
        raise UploadValidationError(
            "FILE_TOO_LARGE",
            f"File size ({curr_mb:.2f} MB) exceeds maximum allowed size of {max_mb} MB.",
            status_code=413
        )

    clean_name = (filename or "unnamed_file").strip()
    clean_name_lower = clean_name.lower()

    if clean_name_lower.endswith(".csv"):
        fmt = "csv"
    elif clean_name_lower.endswith(".xlsx"):
        fmt = "xlsx"
    else:
        raise UploadValidationError(
            "UNSUPPORTED_FORMAT",
            f"Unsupported file format for '{clean_name}'. Only .csv and .xlsx files are supported.",
            status_code=415
        )

    raw_rows: list[list[Any]] = []
    sheet_used: str | None = None

    if fmt == "xlsx":
        # 1. Validate PK signature for ZIP/OOXML package
        if not contents.startswith(b"PK\x03\x04"):
            raise UploadValidationError(
                "CORRUPTED_FILE",
                "Invalid Excel file: missing ZIP/OOXML header signature (file may be corrupted or renamed).",
                status_code=422
            )

        # 2. Open workbook with openpyxl (read_only=False to unmerge and inspect formulas)
        try:
            wb_raw = openpyxl.load_workbook(io.BytesIO(contents), data_only=False)
            wb_eval = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        except Exception as e:
            err_str = str(e).lower()
            if "password" in err_str or "encrypt" in err_str:
                raise UploadValidationError(
                    "PASSWORD_PROTECTED",
                    "Excel workbook is password-protected or encrypted. Please remove password protection before uploading.",
                    status_code=422
                )
            raise UploadValidationError(
                "CORRUPTED_FILE",
                f"Cannot open Excel file: {e!s}",
                status_code=422
            )

        # 3. Select first non-empty worksheet deterministically
        for name in wb_raw.sheetnames:
            s_raw = wb_raw[name]
            has_data = False
            for row in s_raw.iter_rows(values_only=True):
                if any(c is not None and str(c).strip() != "" for c in row):
                    has_data = True
                    break
            if has_data:
                sheet_used = name
                break

        if not sheet_used:
            raise UploadValidationError("EMPTY_FILE", "Excel workbook contains no data.", status_code=400)

        ws_raw = wb_raw[sheet_used]
        ws_eval = wb_eval[sheet_used]

        # 4. Handle merged cells: unmerge and propagate top-left value across the range
        for r in list(ws_eval.merged_cells.ranges):
            top_left_val = ws_eval.cell(row=r.min_row, column=r.min_col).value
            ws_eval.unmerge_cells(str(r))
            for row in range(r.min_row, r.max_row + 1):
                for col in range(r.min_col, r.max_col + 1):
                    ws_eval.cell(row=row, column=col).value = top_left_val

        # 5. Check for formula cells with no cached value
        for row in ws_eval.iter_rows():
            for cell in row:
                val = cell.value
                raw_cell = ws_raw.cell(row=cell.row, column=cell.column)
                raw_val = raw_cell.value
                if isinstance(raw_val, str) and raw_val.strip().startswith("=") and val is None:
                    raise UploadValidationError(
                        "INVALID_VALUE",
                        f"Formula in cell {cell.coordinate} (Sheet '{sheet_used}') has no cached value. Please calculate and save the workbook in Excel before uploading.",
                        details=[{"row": cell.row, "column": cell.column_letter, "problem": "Formula has no cached value"}],
                        status_code=422
                    )

        # 6. Extract rows
        for row in ws_eval.iter_rows(values_only=True):
            raw_rows.append(list(row))

    else:
        # CSV Handling: decode with utf-8-sig (handles UTF-8 BOM automatically)
        try:
            text = contents.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                text = contents.decode("cp1252")
            except UnicodeDecodeError:
                raise UploadValidationError(
                    "CORRUPTED_FILE",
                    "Failed to decode CSV file: text encoding is not valid UTF-8.",
                    status_code=422
                )

        if not text or not text.strip():
            raise UploadValidationError("EMPTY_FILE", "The uploaded CSV file is empty.", status_code=400)

        try:
            raw_rows = list(csv.reader(io.StringIO(text.strip())))
        except Exception as e:
            raise UploadValidationError("CORRUPTED_FILE", f"Cannot read CSV file structure: {e!s}", status_code=422)

    # Filter leading and trailing empty rows
    clean_rows: list[list[Any]] = []
    for r in raw_rows:
        if r and any(c is not None and str(c).strip() != "" for c in r):
            clean_rows.append(r)

    if not clean_rows:
        raise UploadValidationError("EMPTY_FILE", "File contains no data rows.", status_code=400)

    # Row and Column Limits
    if len(clean_rows) > max_rows:
        raise UploadValidationError(
            "FILE_TOO_LARGE",
            f"File exceeds maximum allowed rows ({len(clean_rows)} > {max_rows}).",
            status_code=422
        )
    if any(len(r) > max_cols for r in clean_rows):
        raise UploadValidationError(
            "FILE_TOO_LARGE",
            f"File exceeds maximum allowed columns (max {max_cols}).",
            status_code=422
        )

    # Header Row Detection
    header_row_idx: int | None = None
    col_indices: dict[str, int] = {}

    for idx, r in enumerate(clean_rows):
        candidate_map = {normalize_column_name(c): i for i, c in enumerate(r)}
        matched = [col for col in REQUIRED_CORE_COLUMNS if col in candidate_map]
        if len(matched) == len(REQUIRED_CORE_COLUMNS):
            header_row_idx = idx
            col_indices = candidate_map
            break

    if header_row_idx is None:
        for idx, r in enumerate(clean_rows):
            candidate_map = {normalize_column_name(c): i for i, c in enumerate(r)}
            matched = [col for col in REQUIRED_CORE_COLUMNS if col in candidate_map]
            if len(matched) >= 3:
                header_row_idx = idx
                col_indices = candidate_map
                break

    if header_row_idx is None:
        header_row_idx = 0
        col_indices = {normalize_column_name(c): i for i, c in enumerate(clean_rows[0])}

    missing_core = [c for c in REQUIRED_CORE_COLUMNS if c not in col_indices]
    if missing_core:
        details = [{"column": c, "problem": "Required column is missing"} for c in missing_core]
        raise UploadValidationError(
            "MISSING_COLUMNS",
            f"Missing required columns in {clean_name}: {', '.join(missing_core)}. Expected: {', '.join(REQUIRED_COLUMNS)}.",
            details=details,
            status_code=422
        )

    # Check Day column or Day section headers
    day_idx = col_indices.get("Day")
    has_day_headers = any(is_day_header(c) for r in clean_rows for c in r if c is not None)
    if day_idx is None and not has_day_headers:
        details = [{"column": "Day", "problem": "Required column is missing"}]
        raise UploadValidationError(
            "MISSING_COLUMNS",
            f"Missing required columns in {clean_name}: Day. Expected: {', '.join(REQUIRED_COLUMNS)}.",
            details=details,
            status_code=422
        )

    time_col_idxs = [col_indices[tc] for tc in TIME_COLS]
    service_idx = col_indices["Service"]

    days_order: list[str] = []
    day_records: dict[str, dict[str, list[int]]] = {}
    warnings: list[dict[str, Any]] = []
    rejected_rows: list[dict[str, Any]] = []

    source_row_count = 0
    valid_row_count = 0
    current_day: str | None = None

    # Parse and validate each data row
    for r_idx, row in enumerate(clean_rows):
        display_row_num = r_idx + 1

        # Check if entire row is empty
        if not row or not any(c is not None and str(c).strip() != "" for c in row):
            continue

        first_non_empty = next((c for c in row if c is not None and str(c).strip() != ""), None)

        # 1. Day Section Header check (e.g. Day-1, Day 1, Monday)
        if (
            is_day_header(first_non_empty)
            and normalize_service_name(first_non_empty) is None
            and (day_idx is None or day_idx >= len(row) or not str(row[day_idx]).strip())
        ):
            current_day = str(first_non_empty).strip()
            continue

        # 2. Table Column Header check (skip initial or repeated header rows)
        cand_map = {normalize_column_name(c): i for i, c in enumerate(row)}
        if all(tc in cand_map for tc in TIME_COLS) and "Service" in cand_map:
            col_indices = cand_map
            time_col_idxs = [col_indices[tc] for tc in TIME_COLS]
            service_idx = col_indices["Service"]
            if "Day" in cand_map:
                day_idx = cand_map["Day"]
            continue

        # 3. Check for Service value and numeric presence
        raw_serv = row[service_idx] if service_idx < len(row) else None
        serv_str = str(raw_serv).strip() if raw_serv is not None else ""
        norm_serv = normalize_service_name(serv_str)

        has_time_values = any(
            row[c] is not None and str(row[c]).strip() != ""
            for c in time_col_idxs if c < len(row)
        )

        # Ignore annotation, signature, or trailing non-data rows
        if not norm_serv and not has_time_values:
            continue

        source_row_count += 1

        if not serv_str:
            raise UploadValidationError(
                "INVALID_VALUE",
                f"Missing 'Service' value at row {display_row_num}.",
                details=[{"row": display_row_num, "column": "Service", "problem": "Missing service value"}],
                status_code=422
            )

        if not norm_serv:
            raise UploadValidationError(
                "UNKNOWN_SERVICE",
                f"Unknown service '{serv_str}' at row {display_row_num}. Expected one of: {', '.join(REQUIRED_SERVICES)}.",
                details=[{"row": display_row_num, "column": "Service", "problem": f"Unknown service '{serv_str}'"}],
                status_code=422
            )

        # Determine Day for this record
        raw_day = row[day_idx] if (day_idx is not None and day_idx < len(row)) else None
        day_str = str(raw_day).strip() if raw_day is not None else ""
        if not day_str:
            if current_day:
                day_str = current_day
            elif day_idx is not None:
                raise UploadValidationError(
                    "INVALID_VALUE",
                    f"Missing 'Day' value at row {display_row_num}.",
                    details=[{"row": display_row_num, "column": "Day", "problem": "Missing day value"}],
                    status_code=422
                )
            else:
                day_str = f"Day {len(days_order) + 1}"
                current_day = day_str

        # Validate Time Slot Counts
        counts = []
        for col_name, c_idx in zip(TIME_COLS, time_col_idxs):
            val_raw = row[c_idx] if c_idx < len(row) else None
            if val_raw is None or str(val_raw).strip() == "":
                counts.append(0)
                continue

            val_str = str(val_raw).strip()
            try:
                num_float = float(val_str)
            except (ValueError, TypeError):
                raise UploadValidationError(
                    "INVALID_VALUE",
                    f"Column '{col_name}' contains non-numeric value '{val_str}' at row {display_row_num}.",
                    details=[{"row": display_row_num, "column": col_name, "problem": f"Non-numeric value '{val_str}'"}],
                    status_code=422
                )

            if num_float < 0:
                raise UploadValidationError(
                    "INVALID_VALUE",
                    f"Column '{col_name}' contains negative demand value {val_str} at row {display_row_num}.",
                    details=[{"row": display_row_num, "column": col_name, "problem": f"Negative demand {val_str}"}],
                    status_code=422
                )

            if not num_float.is_integer():
                raise UploadValidationError(
                    "INVALID_VALUE",
                    f"Column '{col_name}' contains decimal value {val_str} at row {display_row_num}; demand orders must be whole integers.",
                    details=[{"row": display_row_num, "column": col_name, "problem": f"Decimal value {val_str} where integer required"}],
                    status_code=422
                )

            counts.append(int(num_float))

        if day_str not in day_records:
            days_order.append(day_str)
            day_records[day_str] = {}

        # Handle duplicate service entries for same day (accumulate and record warning)
        if norm_serv in day_records[day_str]:
            day_records[day_str][norm_serv] = [
                a + b for a, b in zip(day_records[day_str][norm_serv], counts)
            ]
            warnings.append({
                "row": display_row_num,
                "message": f"Duplicate service entry '{norm_serv}' for day '{day_str}' at row {display_row_num}. Demand counts were combined."
            })
        else:
            day_records[day_str][norm_serv] = counts

        valid_row_count += 1

    if not days_order:
        raise UploadValidationError("EMPTY_FILE", "File contains no valid demand records.", status_code=400)

    # 7-day model alignment
    if len(days_order) < 7:
        known_weekdays = [w for w in DEFAULT_WEEKDAYS if w not in days_order]
        orig_days_count = len(days_order)
        while len(days_order) < 7:
            pad_name = known_weekdays.pop(0) if known_weekdays else f"Day {len(days_order) + 1}"
            days_order.append(pad_name)
            day_records[pad_name] = {}
        warnings.append({
            "row": 0,
            "message": f"File provided {orig_days_count} days. The 7-day model auto-padded {7 - orig_days_count} missing day(s) with zero demand."
        })
    elif len(days_order) > 7:
        total_days = len(days_order)
        days_order = days_order[:7]
        warnings.append({
            "row": 0,
            "message": f"File provided {total_days} days. Only the first 7 operating days were analyzed."
        })

    daily_matrices: list[np.ndarray] = []
    day_names: list[str] = []
    structured_rows: list[dict[str, Any]] = []
    observations_list: list[np.ndarray] = []

    for d_num, d_name in enumerate(days_order, start=1):
        services_in_day = day_records.get(d_name, {})
        day_matrix = np.zeros((4, 4), dtype=int)

        for s_idx, s_name in enumerate(REQUIRED_SERVICES):
            counts = services_in_day.get(s_name, [0, 0, 0, 0])
            day_matrix[s_idx, :] = counts

            structured_rows.append({
                "day_number": d_num,
                "day_name": str(d_name),
                "service": s_name,
                "slot_9_11": counts[0],
                "slot_11_1": counts[1],
                "slot_1_4": counts[2],
                "slot_4_6": counts[3]
            })

        daily_matrices.append(day_matrix)
        day_names.append(str(d_name))

        for j in range(4):
            obs_vector = day_matrix[:, j]
            observations_list.append(obs_vector)

    observations_array = np.array(observations_list, dtype=float)
    W = np.sum(daily_matrices, axis=0)
    weekly_demand = int(np.sum(W))

    return {
        "ok": True,
        "file_name": clean_name,
        "format": fmt,
        "sheet_used": sheet_used,
        "source_row_count": source_row_count,
        "valid_row_count": valid_row_count,
        "normalized_record_count": len(structured_rows),
        "weekly_demand": weekly_demand,
        "preview_rows": structured_rows,
        "warnings": warnings,
        "rejected_rows": rejected_rows,
        "daily_matrices": daily_matrices,
        "day_names": day_names,
        "observations": observations_array,
        "structured_rows": structured_rows
    }

