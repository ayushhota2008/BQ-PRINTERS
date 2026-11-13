import io
import os

import numpy as np
import openpyxl
import pytest
from fastapi.testclient import TestClient

from app.file_parser import UploadValidationError, parse_uploaded_file
from app.main import app, run_full_pipeline
from app.models import DatasetAssumptions

client = TestClient(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CSV_PATH = os.path.join(DATA_DIR, "sample_academic_dataset.csv")
XLSX_PATH = os.path.join(DATA_DIR, "sample_academic_dataset.xlsx")

@pytest.fixture
def academic_csv_bytes() -> bytes:
    with open(CSV_PATH, "rb") as f:
        return f.read()

@pytest.fixture
def academic_xlsx_bytes() -> bytes:
    with open(XLSX_PATH, "rb") as f:
        return f.read()

# 1. Valid CSV upload
def test_valid_csv_upload(academic_csv_bytes):
    res = parse_uploaded_file("sample_academic_dataset.csv", academic_csv_bytes)
    assert res["ok"] is True
    assert res["format"] == "csv"
    assert res["sheet_used"] is None
    assert res["weekly_demand"] == 1840
    assert res["source_row_count"] == 28
    assert res["valid_row_count"] == 28
    assert res["normalized_record_count"] == 28
    assert len(res["daily_matrices"]) == 7
    assert res["observations"].shape == (28, 4)

# 2. Valid XLSX upload
def test_valid_xlsx_upload(academic_xlsx_bytes):
    res = parse_uploaded_file("sample_academic_dataset.xlsx", academic_xlsx_bytes)
    assert res["ok"] is True
    assert res["format"] == "xlsx"
    assert res["sheet_used"] is not None
    assert res["weekly_demand"] == 1840
    assert res["source_row_count"] == 28
    assert res["valid_row_count"] == 28
    assert res["normalized_record_count"] == 28
    assert len(res["daily_matrices"]) == 7
    assert res["observations"].shape == (28, 4)

# 3. CSV with UTF-8 BOM
def test_csv_with_utf8_bom(academic_csv_bytes):
    bom_bytes = b"\xef\xbb\xbf" + academic_csv_bytes
    res = parse_uploaded_file("academic_with_bom.csv", bom_bytes)
    assert res["ok"] is True
    assert res["weekly_demand"] == 1840
    assert res["valid_row_count"] == 28

# 4. Correct extraction of XLSX headers and cell values (including floats like 12.0 -> 12)
def test_xlsx_float_to_int_extraction():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "FloatTest"
    ws.append(["Day", "Service", "9 AM–11 AM", "11 AM–1 PM", "1 PM–4 PM", "4 PM–6 PM"])
    ws.append(["Monday", "B&W Printing", 12.0, 34.0, 56.0, 78.0])

    buf = io.BytesIO()
    wb.save(buf)
    res = parse_uploaded_file("float_test.xlsx", buf.getvalue())
    assert res["ok"] is True
    first_row = res["preview_rows"][0]
    assert first_row["slot_9_11"] == 12
    assert first_row["slot_11_1"] == 34
    assert first_row["slot_1_4"] == 56
    assert first_row["slot_4_6"] == 78
    assert isinstance(first_row["slot_9_11"], int)

# 5. Correct weekly demand calculation
def test_correct_weekly_demand_calculation(academic_csv_bytes):
    res = parse_uploaded_file("demand.csv", academic_csv_bytes)
    assert res["weekly_demand"] == 1840
    # Service totals sum
    W = np.sum(res["daily_matrices"], axis=0)
    service_totals = np.sum(W, axis=1)
    # B&W (918), Colour (319), Binding (107), Photocopying (496)
    assert service_totals[0] == 918
    assert service_totals[1] == 319
    assert service_totals[2] == 107
    assert service_totals[3] == 496
    assert int(np.sum(service_totals)) == 1840

# 6. Missing required columns
def test_missing_required_columns():
    csv_missing = "Day,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\nMonday,10,20,30,40"
    with pytest.raises(UploadValidationError) as exc_info:
        parse_uploaded_file("missing_cols.csv", csv_missing.encode("utf-8"))
    assert exc_info.value.error_code == "MISSING_COLUMNS"
    assert exc_info.value.status_code == 422
    assert any("Service" in d.get("column", "") for d in exc_info.value.details)

# 7. Empty CSV and empty Excel workbook
def test_empty_csv_and_empty_xlsx():
    # Empty CSV
    with pytest.raises(UploadValidationError) as exc_csv:
        parse_uploaded_file("empty.csv", b"")
    assert exc_csv.value.error_code == "EMPTY_FILE"
    assert exc_csv.value.status_code == 400

    # CSV with only whitespace
    with pytest.raises(UploadValidationError) as exc_ws:
        parse_uploaded_file("empty_ws.csv", b"   \n  \n")
    assert exc_ws.value.error_code == "EMPTY_FILE"

    # Empty XLSX workbook
    wb = openpyxl.Workbook()
    buf = io.BytesIO()
    wb.save(buf)
    with pytest.raises(UploadValidationError) as exc_xlsx:
        parse_uploaded_file("empty.xlsx", buf.getvalue())
    assert exc_xlsx.value.error_code == "EMPTY_FILE"
    assert exc_xlsx.value.status_code == 400

# 8. Corrupted Excel file and renamed non-Excel file
def test_corrupted_excel_and_renamed_txt():
    # Renamed .txt saved as .xlsx (no PK header)
    with pytest.raises(UploadValidationError) as exc_renamed:
        parse_uploaded_file("fake.xlsx", b"This is just plain text content.")
    assert exc_renamed.value.error_code == "CORRUPTED_FILE"
    assert exc_renamed.value.status_code == 422

    # Broken ZIP file with PK signature but corrupt data
    with pytest.raises(UploadValidationError) as exc_corrupt:
        parse_uploaded_file("corrupt.xlsx", b"PK\x03\x04\x00\x00\x00\x00corrupted_archive_data")
    assert exc_corrupt.value.error_code == "CORRUPTED_FILE"
    assert exc_corrupt.value.status_code == 422

# 9. Negative demand values
def test_negative_demand_values():
    csv_negative = (
        "Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\n"
        "Monday,B&W Printing,10,-5,20,30"
    )
    with pytest.raises(UploadValidationError) as exc:
        parse_uploaded_file("neg.csv", csv_negative.encode("utf-8"))
    assert exc.value.error_code == "INVALID_VALUE"
    assert "negative" in exc.value.message.lower()
    assert exc.value.status_code == 422

# 10. Non-numeric demand values and decimal demand values
def test_non_numeric_and_decimal_demand_values():
    # Non-numeric string
    csv_nan = (
        "Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\n"
        "Monday,B&W Printing,10,N/A,20,30"
    )
    with pytest.raises(UploadValidationError) as exc_nan:
        parse_uploaded_file("nan.csv", csv_nan.encode("utf-8"))
    assert exc_nan.value.error_code == "INVALID_VALUE"
    assert "non-numeric" in exc_nan.value.message.lower()

    # Decimal where whole integers are required
    csv_dec = (
        "Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\n"
        "Monday,B&W Printing,10,12.5,20,30"
    )
    with pytest.raises(UploadValidationError) as exc_dec:
        parse_uploaded_file("dec.csv", csv_dec.encode("utf-8"))
    assert exc_dec.value.error_code == "INVALID_VALUE"
    assert "decimal" in exc_dec.value.message.lower()

# 11. Duplicate service entries and partial-day handling
def test_duplicate_service_entries_and_partial_days():
    # Duplicate service on Monday
    csv_dup = (
        "Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\n"
        "Monday,B&W Printing,10,20,30,40\n"
        "Monday,B&W Printing,5,5,5,5\n"
        "Tuesday,Colour Printing,10,10,10,10\n"
        "Wednesday,Binding,5,5,5,5\n"
        "Thursday,Photocopying,20,20,20,20\n"
        "Friday,B&W Printing,15,15,15,15\n"
    )
    res = parse_uploaded_file("dup.csv", csv_dup.encode("utf-8"))
    assert res["ok"] is True
    # Combined Monday B&W Printing: [15, 25, 35, 45] -> sum 120
    mon_bw = next(r for r in res["preview_rows"] if r["day_name"] == "Monday" and r["service"] == "B&W Printing")
    assert mon_bw["slot_9_11"] == 15
    assert mon_bw["slot_11_1"] == 25
    assert mon_bw["slot_1_4"] == 35
    assert mon_bw["slot_4_6"] == 45
    # Warning emitted for duplicate
    assert any("duplicate" in w["message"].lower() for w in res["warnings"])
    # 5 days provided -> auto-padded to 7 days
    assert len(res["daily_matrices"]) == 7
    assert any("auto-padded" in w["message"].lower() for w in res["warnings"])

# 12. Unknown service names
def test_unknown_service_names():
    csv_unknown = (
        "Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM\n"
        "Monday,3D Printing Pro,10,20,30,40"
    )
    with pytest.raises(UploadValidationError) as exc:
        parse_uploaded_file("unknown_serv.csv", csv_unknown.encode("utf-8"))
    assert exc.value.error_code == "UNKNOWN_SERVICE"
    assert exc.value.status_code == 422
    assert "3D Printing Pro" in exc.value.message

# 13. Multi-sheet workbook
def test_multi_sheet_workbook():
    wb = openpyxl.Workbook()
    # Sheet 1: Blank
    ws1 = wb.active
    ws1.title = "EmptySheet"

    # Sheet 2: Valid academic data
    ws2 = wb.create_sheet(title="DemandData")
    ws2.append(["Day", "Service", "9 AM–11 AM", "11 AM–1 PM", "1 PM–4 PM", "4 PM–6 PM"])
    ws2.append(["Monday", "B&W Printing", 25, 35, 20, 10])

    buf = io.BytesIO()
    wb.save(buf)

    res = parse_uploaded_file("multi_sheet.xlsx", buf.getvalue())
    assert res["ok"] is True
    assert res["sheet_used"] == "DemandData"
    assert res["valid_row_count"] == 1

# 14. File larger than limit
def test_file_larger_than_limit():
    large_data = b"x" * 200
    with pytest.raises(UploadValidationError) as exc:
        parse_uploaded_file("large.csv", large_data, max_file_size=100)
    assert exc.value.error_code == "FILE_TOO_LARGE"
    assert exc.value.status_code == 413

# 15. Unsupported extension (.xls, .pdf)
def test_unsupported_extension():
    for ext in ["data.xls", "report.pdf", "sheet.ods", "data.xlsm"]:
        with pytest.raises(UploadValidationError) as exc:
            parse_uploaded_file(ext, b"dummy content")
        assert exc.value.error_code == "UNSUPPORTED_FORMAT"
        assert exc.value.status_code == 415

# 16. Preview totals == final analysis input totals guarantee (via FastAPI endpoints)
def test_preview_totals_equal_analysis_input_totals(academic_xlsx_bytes):
    # Call /api/upload/preview
    prev_resp = client.post(
        "/api/upload/preview",
        files={"file": ("sample_academic_dataset.xlsx", academic_xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert prev_resp.status_code == 200
    prev_json = prev_resp.json()
    assert prev_json["ok"] is True
    assert prev_json["weekly_demand"] == 1840
    assert prev_json["valid_row_count"] == 28
    assert prev_json["normalized_record_count"] == 28

    # Call /api/analyze-csv
    ana_resp = client.post(
        "/api/analyze-csv",
        files={"file": ("sample_academic_dataset.xlsx", academic_xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert ana_resp.status_code == 200
    ana_json = ana_resp.json()
    assert ana_json["calculations"]["total_weekly_demand"] == prev_json["weekly_demand"]
    assert ana_json["valid_row_count"] == prev_json["valid_row_count"]

# 17. Standard Error Shape Verification across API
def test_standard_error_shape_on_invalid_upload():
    # Corrupt upload to /api/upload/preview
    prev_bad = client.post(
        "/api/upload/preview",
        files={"file": ("bad.xlsx", b"not an excel zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert prev_bad.status_code == 422
    err_json = prev_bad.json()
    assert err_json["ok"] is False
    assert err_json["error_code"] == "CORRUPTED_FILE"
    assert "Invalid Excel file" in err_json["message"]
    assert "details" in err_json

    # Corrupt upload to /api/analyze-csv
    ana_bad = client.post(
        "/api/analyze-csv",
        files={"file": ("bad.xlsx", b"not an excel zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert ana_bad.status_code == 422
    assert ana_bad.json()["error_code"] == "CORRUPTED_FILE"

# 19. Block-sectioned day workbook (e.g., Day-1 section headers, repeated headers, signature row)
def test_block_formatted_day_section_workbook():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BlockTest"
    # Day-1 section
    ws.append(["Day-1"])
    ws.append(["Services", "9AM-11AM", "11AM-1PM", "1PM-4PM", "4PM-6PM"])
    ws.append(["B&W Printing", 18, 30, 21, 39])
    ws.append(["Colour Printing", 12, 13, 10, 5])
    ws.append(["Binding", 4, 7, 3, 0])
    ws.append(["Photocopying", 20, 15, 16, 9])
    # Day-2 section
    ws.append(["Day-2"])
    ws.append(["Services", "9AM-11AM", "11AM-1PM", "1PM-4PM", "4PM-6PM"])
    ws.append(["B&W Printing", 26, 18, 31, 12])
    ws.append(["Colour Printing", 14, 20, 24, 9])
    ws.append(["Binding", 5, 8, 15, 3])
    ws.append(["Photocopying", 23, 11, 17, 8])
    # Trailing signature note
    ws.append(["Shopkeeper Signature"])

    buf = io.BytesIO()
    wb.save(buf)

    res = parse_uploaded_file("block_test.xlsx", buf.getvalue())
    assert res["ok"] is True
    assert res["valid_row_count"] == 8
    assert "Day-1" in res["day_names"]
    assert "Day-2" in res["day_names"]
    # 2 days provided -> 7-day model auto-pads to 7
    assert len(res["daily_matrices"]) == 7

def test_csv_vs_xlsx_regression_equivalence(academic_csv_bytes, academic_xlsx_bytes):
    csv_res = parse_uploaded_file("academic.csv", academic_csv_bytes)
    xlsx_res = parse_uploaded_file("academic.xlsx", academic_xlsx_bytes)

    # Identical parsing output
    assert csv_res["weekly_demand"] == xlsx_res["weekly_demand"] == 1840
    assert csv_res["valid_row_count"] == xlsx_res["valid_row_count"] == 28

    for d_idx in range(7):
        np.testing.assert_array_equal(
            csv_res["daily_matrices"][d_idx],
            xlsx_res["daily_matrices"][d_idx]
        )
    np.testing.assert_array_equal(csv_res["observations"], xlsx_res["observations"])

    # Full math engine execution
    assumptions = DatasetAssumptions()
    csv_calc = run_full_pipeline(
        csv_res["daily_matrices"], csv_res["day_names"], csv_res["observations"], assumptions
    )
    xlsx_calc = run_full_pipeline(
        xlsx_res["daily_matrices"], xlsx_res["day_names"], xlsx_res["observations"], assumptions
    )

    # Assert exact equality across all mathematical results
    assert csv_calc.total_weekly_demand == xlsx_calc.total_weekly_demand == 1840
    assert csv_calc.average_daily_demand == xlsx_calc.average_daily_demand
    assert csv_calc.top_service == xlsx_calc.top_service
    assert csv_calc.peak_time_slot == xlsx_calc.peak_time_slot
    assert csv_calc.weekly_matrix == xlsx_calc.weekly_matrix
    assert csv_calc.advanced_analysis.matrix_rank == xlsx_calc.advanced_analysis.matrix_rank == 7
    assert csv_calc.advanced_analysis.eigenvalues == xlsx_calc.advanced_analysis.eigenvalues
    assert csv_calc.advanced_analysis.variance_explained == xlsx_calc.advanced_analysis.variance_explained
    assert csv_calc.printer_metrics.hp_laser_303dw["estimated_pages"] == xlsx_calc.printer_metrics.hp_laser_303dw["estimated_pages"]
    assert csv_calc.printer_metrics.canon_pixma_g670["estimated_pages"] == xlsx_calc.printer_metrics.canon_pixma_g670["estimated_pages"]
    assert csv_calc.printer_metrics.hp_laser_303dw["load_ratio_percent"] == xlsx_calc.printer_metrics.hp_laser_303dw["load_ratio_percent"]
    assert csv_calc.printer_metrics.canon_pixma_g670["load_ratio_percent"] == xlsx_calc.printer_metrics.canon_pixma_g670["load_ratio_percent"]
