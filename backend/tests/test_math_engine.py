import numpy as np
import pytest

from app.csv_parser import CSVParser
from app.math_engine import MathEngine
from app.sample_data import get_sample_csv_text


def test_csv_parser_and_sample_dataset():
    csv_text = get_sample_csv_text()
    daily_matrices, day_names, observations, structured_rows = CSVParser.parse_and_validate(csv_text)

    assert len(daily_matrices) == 7
    assert len(day_names) == 7
    assert observations.shape == (28, 4)
    assert len(structured_rows) == 28

def test_weekly_matrix_and_totals():
    csv_text = get_sample_csv_text()
    daily_matrices, _day_names, _observations, _ = CSVParser.parse_and_validate(csv_text)

    W = MathEngine.compute_weekly_matrix(daily_matrices)
    assert W.shape == (4, 4)

    # Expected values from academic paper
    expected_W = np.array([
        [259, 355, 214, 90],
        [81, 122, 81, 35],
        [28, 47, 25, 7],
        [146, 204, 98, 48]
    ])
    np.testing.assert_array_equal(W, expected_W)

    service_totals, service_percentages, N = MathEngine.compute_service_totals_and_percentages(W)
    assert N == 1840
    assert service_totals["B&W Printing"] == 918
    assert service_totals["Colour Printing"] == 319
    assert service_totals["Binding"] == 107
    assert service_totals["Photocopying"] == 496

    assert service_percentages["B&W Printing"] == pytest.approx(49.89, abs=1.0)
    assert service_percentages["Colour Printing"] == pytest.approx(17.34, abs=0.5)

    avg_daily = MathEngine.compute_average_daily_demand(N)
    assert avg_daily == pytest.approx(262.86, abs=0.1)

def test_timeslot_metrics():
    csv_text = get_sample_csv_text()
    daily_matrices, _, _, _ = CSVParser.parse_and_validate(csv_text)
    W = MathEngine.compute_weekly_matrix(daily_matrices)

    timeslot_totals, duration_adjusted_rates, peak_slot, _peak_rate = MathEngine.compute_timeslot_metrics(W)

    # 9-11: 514, 11-1: 728, 1-4: 418, 4-6: 180
    assert timeslot_totals["9 AM–11 AM"] == 514
    assert timeslot_totals["11 AM–1 PM"] == 728
    assert timeslot_totals["1 PM–4 PM"] == 418
    assert timeslot_totals["4 PM–6 PM"] == 180

    assert peak_slot == "11 AM–1 PM"
    assert duration_adjusted_rates["9 AM–11 AM"] == pytest.approx(36.71, abs=0.1)
    assert duration_adjusted_rates["11 AM–1 PM"] == pytest.approx(52.00, abs=0.1)
    assert duration_adjusted_rates["1 PM–4 PM"] == pytest.approx(19.90, abs=0.1)
    assert duration_adjusted_rates["4 PM–6 PM"] == pytest.approx(12.86, abs=0.1)

def test_daily_totals_and_rank():
    csv_text = get_sample_csv_text()
    daily_matrices, day_names, _, _ = CSVParser.parse_and_validate(csv_text)

    daily_totals, busiest_day, least_busy_day, rank, M = MathEngine.compute_daily_totals_and_rank(daily_matrices, day_names)

    # Daily totals from paper: 265, 286, 248, 312, 286, 211, 232
    expected_daily = [265, 286, 248, 312, 286, 211, 232]
    actual_daily = [d["total_demand"] for d in daily_totals]
    assert actual_daily == expected_daily

    assert busiest_day["total_demand"] == 312
    assert least_busy_day["total_demand"] == 211
    assert rank == 7
    assert M.shape == (7, 16)

def test_covariance_and_eigenvalues_academic_verification():
    # Directly test the mathematical decomposition using the paper's reported covariance matrix
    paper_cov = np.array([
        [224.175, 69.272, 33.590, 126.122],
        [69.272, 28.914, 10.888, 34.672],
        [33.590, 10.888, 6.448, 18.725],
        [126.122, 34.672, 18.725, 83.249]
    ])
    evals, _evecs = np.linalg.eigh(paper_cov)
    idx_sorted = np.argsort(evals)[::-1]
    sorted_evals = evals[idx_sorted]
    var_explained = (sorted_evals / np.sum(sorted_evals)) * 100.0

    # Values from page 18 of the report:
    # lambda_1 = 323.828 (94.47%)
    # lambda_2 = 13.839 (4.04%)
    # lambda_3 = 3.768 (1.10%)
    # lambda_4 = 1.352 (0.39%)
    assert sorted_evals[0] == pytest.approx(323.828, abs=0.1)
    assert sorted_evals[1] == pytest.approx(13.839, abs=0.1)
    assert sorted_evals[2] == pytest.approx(3.768, abs=0.1)
    assert sorted_evals[3] == pytest.approx(1.352, abs=0.1)

    assert var_explained[0] == pytest.approx(94.47, abs=0.1)
    assert var_explained[1] == pytest.approx(4.04, abs=0.1)
    assert var_explained[2] == pytest.approx(1.10, abs=0.1)
    assert var_explained[3] == pytest.approx(0.39, abs=0.1)

def test_covariance_from_observations():
    csv_text = get_sample_csv_text()
    _, _, observations, _ = CSVParser.parse_and_validate(csv_text)

    _mean_vec, cov_mat, corr_mat, evals, _evecs, var_explained = MathEngine.compute_covariance_and_eigenvalues(observations)

    assert cov_mat.shape == (4, 4)
    assert corr_mat.shape == (4, 4)
    assert len(evals) == 4
    assert np.all(evals >= 0)
    assert np.sum(var_explained) == pytest.approx(100.0, abs=0.01)
    assert evals[0] >= evals[1] >= evals[2] >= evals[3]

def test_printer_capacity():
    csv_text = get_sample_csv_text()
    daily_matrices, _, _, _ = CSVParser.parse_and_validate(csv_text)
    W = MathEngine.compute_weekly_matrix(daily_matrices)
    service_totals, _, _ = MathEngine.compute_service_totals_and_percentages(W)

    res = MathEngine.compute_printer_capacity(
        service_totals=service_totals,
        operating_hours_per_day=[9.0] * 7,
        hp_rated_ppm=30.0,
        canon_rated_ipm=3.9
    )

    hp = res["hp_laser_303dw"]
    canon = res["canon_pixma_g670"]

    assert hp["weekly_capacity"] == 113400
    assert hp["estimated_pages"] == 3672
    assert hp["load_ratio_percent"] == pytest.approx(3.24, abs=0.1)

    assert canon["weekly_capacity"] == 14742
    assert canon["estimated_pages"] == 957
    assert canon["load_ratio_percent"] == pytest.approx(6.49, abs=0.1)

def test_staff_workload():
    csv_text = get_sample_csv_text()
    daily_matrices, day_names, _, _ = CSVParser.parse_and_validate(csv_text)
    W = MathEngine.compute_weekly_matrix(daily_matrices)
    service_totals, _, _ = MathEngine.compute_service_totals_and_percentages(W)

    res = MathEngine.compute_staff_workload(
        service_totals=service_totals,
        daily_matrices=daily_matrices,
        day_names=day_names,
        staff_counts=[3] * 7,
        operating_hours_per_day=[9.0] * 7
    )

    assert res["scheduled_availability_weekly_hours"] == 189.0
    assert res["total_workload_minutes"] == 4960.0
    assert res["total_workload_hours"] == pytest.approx(82.67, abs=0.1)
    assert res["weekly_utilization_percent"] == pytest.approx(43.74, abs=0.1)

def test_csv_parser_partial_services_and_days():
    # Test CSV with only 2 days and missing services
    partial_csv = """Day,Service,9 AM–11 AM,11 AM–1 PM,1 PM–4 PM,4 PM–6 PM
Monday,B&W Printing,10,20,30,40
Tuesday,Photocopying,5,15,25,35"""
    daily_matrices, day_names, observations, structured_rows = CSVParser.parse_and_validate(partial_csv)

    assert len(daily_matrices) == 7
    assert len(day_names) == 7
    assert observations.shape == (28, 4)
    assert len(structured_rows) == 28

    # Monday B&W has values, other services on Monday are 0
    assert daily_matrices[0][0].tolist() == [10, 20, 30, 40]
    assert daily_matrices[0][1].tolist() == [0, 0, 0, 0]

    # Tuesday Photocopying has values, others are 0
    assert daily_matrices[1][3].tolist() == [5, 15, 25, 35]
    assert daily_matrices[1][0].tolist() == [0, 0, 0, 0]

    # Wednesday through Sunday are padded with zero matrices
    for d in range(2, 7):
        assert daily_matrices[d].tolist() == [[0, 0, 0, 0]] * 4
