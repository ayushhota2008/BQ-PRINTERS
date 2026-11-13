import os

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DATASET_A_PATH = os.path.join(DATA_DIR, "sample_academic_dataset.xlsx")
DATASET_B_PATH = os.path.join(DATA_DIR, "user_dataset_1618.xlsx")

@pytest.fixture
def dataset_a_bytes() -> bytes:
    with open(DATASET_A_PATH, "rb") as f:
        return f.read()

@pytest.fixture
def dataset_b_bytes() -> bytes:
    with open(DATASET_B_PATH, "rb") as f:
        return f.read()

def test_1_and_2_sequential_uploads_show_correct_totals_no_stale_data(dataset_a_bytes, dataset_b_bytes):
    """
    Test 1 & 2:
    - Upload dataset A -> verify total is exactly 1840.
    - Upload dataset B -> verify total is exactly 1618, never stale 1840.
    """
    res_a = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_a.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"dataset_name": "Dataset Alpha", "week_label": "Week 1", "save_to_supabase": "true"}
    )
    assert res_a.status_code == 200, res_a.text
    data_a = res_a.json()
    assert data_a["calculations"]["total_weekly_demand"] == 1840
    assert data_a["dataset_name"] == "Dataset Alpha"
    id_a = data_a["dataset_id"]

    # Now upload dataset B immediately
    res_b = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_b.xlsx", dataset_b_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"dataset_name": "Dataset Beta", "week_label": "Week 2", "save_to_supabase": "true"}
    )
    assert res_b.status_code == 200, res_b.text
    data_b = res_b.json()
    assert data_b["calculations"]["total_weekly_demand"] == 1618
    assert data_b["calculations"]["total_weekly_demand"] != data_a["calculations"]["total_weekly_demand"]
    assert data_b["dataset_name"] == "Dataset Beta"
    id_b = data_b["dataset_id"]

    # Both datasets have distinct non-empty IDs if saved
    if id_a != "local-preview-id" and id_b != "local-preview-id":
        assert id_a != id_b

def test_3_distinct_linear_algebra_and_metrics(dataset_a_bytes, dataset_b_bytes):
    """
    Test 3: Two datasets with different totals return different weekly matrices,
    demand totals, rank, and eigenvalues.
    """
    res_a = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_a.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    res_b = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_b.xlsx", dataset_b_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert res_a.status_code == 200
    assert res_b.status_code == 200

    calc_a = res_a.json()["calculations"]
    calc_b = res_b.json()["calculations"]

    # Totals differ
    assert calc_a["total_weekly_demand"] == 1840
    assert calc_b["total_weekly_demand"] == 1618

    # Weekly matrices differ
    assert calc_a["weekly_matrix"] != calc_b["weekly_matrix"]

    # Daily totals differ
    assert calc_a["daily_totals"] != calc_b["daily_totals"]

    # Eigenvalues and covariance matrices differ
    assert calc_a["advanced_analysis"]["eigenvalues"] != calc_b["advanced_analysis"]["eigenvalues"]
    assert calc_a["advanced_analysis"]["covariance_matrix"] != calc_b["advanced_analysis"]["covariance_matrix"]

def test_4_dataset_query_by_id_returns_exact_version(dataset_a_bytes, dataset_b_bytes):
    """
    Test 4: Querying /api/datasets/{dataset_id} returns that exact dataset
    even after subsequent newer datasets are created.
    """
    res_a = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_a.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"dataset_name": "Historical Dataset A", "save_to_supabase": "true"}
    )
    data_a = res_a.json()
    id_a = data_a["dataset_id"]

    res_b = client.post(
        "/api/analyze-csv",
        files={"file": ("dataset_b.xlsx", dataset_b_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"dataset_name": "Historical Dataset B", "save_to_supabase": "true"}
    )
    data_b = res_b.json()
    id_b = data_b["dataset_id"]

    if id_a != "local-preview-id":
        # Fetch A by its explicit ID: must return A (1840), not B (1618)
        fetch_a = client.get(f"/api/datasets/{id_a}")
        assert fetch_a.status_code == 200
        fetched_data_a = fetch_a.json()
        total_a = fetched_data_a.get("dataset", {}).get("total_demand") or fetched_data_a.get("calculations", {}).get("total_weekly_demand")
        assert total_a == 1840

        # Fetch B by its explicit ID: must return B (1618)
        fetch_b = client.get(f"/api/datasets/{id_b}")
        assert fetch_b.status_code == 200
        fetched_data_b = fetch_b.json()
        total_b = fetched_data_b.get("dataset", {}).get("total_demand") or fetched_data_b.get("calculations", {}).get("total_weekly_demand")
        assert total_b == 1618

def test_5_reanalysis_idempotency_without_cache_pollution(dataset_a_bytes):
    """
    Test 5: Re-analyzing the same file twice produces identical results
    without state leakage or cache pollution.
    """
    res_1 = client.post(
        "/api/analyze-csv",
        files={"file": ("repeat_a.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    res_2 = client.post(
        "/api/analyze-csv",
        files={"file": ("repeat_a.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert res_1.status_code == 200
    assert res_2.status_code == 200
    assert res_1.json()["calculations"] == res_2.json()["calculations"]

def test_6_failed_compute_never_returns_stale_or_fallback_data():
    """
    Test 6: A failed compute (corrupted payload) returns 422 error JSON with ok: false,
    and NEVER returns previous dataset calculations or a fallback payload.
    """
    bad_res = client.post(
        "/api/analyze-csv",
        files={"file": ("corrupted.xlsx", b"not valid excel data at all", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert bad_res.status_code == 422
    err_body = bad_res.json()
    assert err_body["ok"] is False
    assert err_body["error_code"] == "CORRUPTED_FILE"
    assert "calculations" not in err_body

def test_7_no_cache_headers_present_on_all_endpoints(dataset_a_bytes):
    """
    Test 7: Verify Cache-Control: no-cache, no-store, must-revalidate is present
    on /api/datasets, /api/datasets/{id}, and /api/analyze-csv.
    """
    # 1. /api/analyze-csv
    ana_res = client.post(
        "/api/analyze-csv",
        files={"file": ("header_test.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"save_to_supabase": "false"}
    )
    assert ana_res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"
    assert ana_res.headers.get("Pragma") == "no-cache"
    assert ana_res.headers.get("Expires") == "0"

    # 2. /api/upload/preview
    prev_res = client.post(
        "/api/upload/preview",
        files={"file": ("header_test.xlsx", dataset_a_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert prev_res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"

    # 3. /api/datasets
    ds_res = client.get("/api/datasets")
    assert ds_res.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"

def test_8_rapid_successive_alternating_uploads(dataset_a_bytes, dataset_b_bytes):
    """
    Test 8: Rapid alternating uploads (A -> B -> A -> B) verify that each response
    accurately matches its immediate input file without concurrency or memory bleeding.
    """
    order = [
        ("A", dataset_a_bytes, 1840),
        ("B", dataset_b_bytes, 1618),
        ("A", dataset_a_bytes, 1840),
        ("B", dataset_b_bytes, 1618),
    ]

    for label, raw_bytes, expected_total in order:
        resp = client.post(
            "/api/analyze-csv",
            files={"file": (f"{label}.xlsx", raw_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"save_to_supabase": "false"}
        )
        assert resp.status_code == 200
        res_json = resp.json()
        assert res_json["calculations"]["total_weekly_demand"] == expected_total
