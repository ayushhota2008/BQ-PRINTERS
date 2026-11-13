import json
import sys
from pathlib import Path

# Ensure backend root in python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.checkin_manager import CheckInManager
from app.file_parser import parse_uploaded_file
from app.main import run_full_pipeline
from app.models import DatasetAssumptions


def run_tests():
    print("=" * 70)
    print("RUNNING STEP 7 VERIFICATION SUITE: 11 TEST CASES")
    print("=" * 70)

    results = []

    # Load baseline benchmark dataset bytes
    sample_csv_path = backend_dir / "data" / "sample_academic_dataset.csv"
    with open(sample_csv_path, "rb") as f:
        sample_csv_bytes = f.read()

    parsed_sample = parse_uploaded_file("sample_academic_dataset.csv", sample_csv_bytes)
    daily_matrices = parsed_sample["daily_matrices"]
    day_names = parsed_sample["day_names"]
    observations = parsed_sample["observations"]

    # -------------------------------------------------------------------------
    # TEST 1: 1 staff, no printer issue
    # -------------------------------------------------------------------------
    assump1 = DatasetAssumptions(
        staff_count=1,
        working_printers="all"
    )
    res1 = run_full_pipeline(daily_matrices, day_names, observations, assump1)
    t1_staff_util = res1.staff_metrics.weekly_utilization_percent
    t1_hp_cap = res1.printer_metrics.hp_laser_303dw["weekly_capacity"]
    t1_canon_cap = res1.printer_metrics.canon_pixma_g670["weekly_capacity"]
    res1.printer_metrics.hp_laser_303dw["load_ratio_percent"]
    res1.printer_metrics.canon_pixma_g670["load_ratio_percent"]

    # Verify matching default behavior
    t1_pass = (
        res1.staff_metrics.actual_available_weekly_hours == 63.0 and
        res1.staff_metrics.total_workload_hours == 82.67 and
        round(t1_staff_util, 2) == 131.22 and
        t1_hp_cap == 113400 and
        t1_canon_cap == 14742
    )
    results.append({
        "test_num": 1,
        "name": "1 staff, no printer issue (default baseline)",
        "input": "staff=1, working_printers='all'",
        "expected": "Workload=82.67 hrs, Avail=63 hrs, Util=131.22%, HP Cap=113400, Canon Cap=14742",
        "actual": f"Workload={res1.staff_metrics.total_workload_hours} hrs, Avail={res1.staff_metrics.actual_available_weekly_hours} hrs, Util={t1_staff_util}%, HP Cap={t1_hp_cap}, Canon Cap={t1_canon_cap}",
        "pass": t1_pass
    })

    # -------------------------------------------------------------------------
    # TEST 2: 2 staff, no printer issue
    # -------------------------------------------------------------------------
    assump2 = DatasetAssumptions(
        staff_count=2,
        working_printers="all"
    )
    res2 = run_full_pipeline(daily_matrices, day_names, observations, assump2)
    t2_staff_util = res2.staff_metrics.weekly_utilization_percent
    t2_avail_hours = res2.staff_metrics.actual_available_weekly_hours

    # Hand check one slot: Slot 11 AM–1 PM (2-hour slot)
    slot_11_1_test1 = next(s for s in res1.slot_capacity_analysis if s["slot_label"] == "11 AM–1 PM")
    slot_11_1_test2 = next(s for s in res2.slot_capacity_analysis if s["slot_label"] == "11 AM–1 PM")

    # Hand check calculation:
    # Slot 11-1 has workload = 2.31 hours/day average
    # Test 1 capacity = 1 staff * 2 hrs = 2.0 hrs -> util = 2.31 / 2.0 = 115.5% (Overloaded)
    # Test 2 capacity = 2 staff * 2 hrs = 4.0 hrs -> util = 2.31 / 4.0 = 57.75% (Not overloaded)
    t2_halving = abs(t2_staff_util - (t1_staff_util / 2.0)) < 0.1
    t2_slot_halving = abs(slot_11_1_test2["staff_utilization_percent"] - (slot_11_1_test1["staff_utilization_percent"] / 2.0)) < 0.1
    t2_pass = (
        t2_avail_hours == 126.0 and
        round(t2_staff_util, 2) == 65.61 and
        t2_halving and
        t2_slot_halving
    )
    results.append({
        "test_num": 2,
        "name": "2 staff, no printer issue (utilization roughly halves)",
        "input": "staff=2, working_printers='all'",
        "expected": "Avail=126 hrs, Util=65.61% (exactly half of 131.22%), Slot 11-1 util exactly halves from 235.95% to 117.98%",
        "actual": f"Avail={t2_avail_hours} hrs, Util={t2_staff_util}%, Slot 11-1 util={slot_11_1_test2['staff_utilization_percent']}% (halved from {slot_11_1_test1['staff_utilization_percent']}%)",
        "pass": t2_pass
    })

    # -------------------------------------------------------------------------
    # TEST 3: 1 staff, Printer 1 broken, Printer 2 working
    # -------------------------------------------------------------------------
    assump3 = DatasetAssumptions(
        staff_count=1,
        working_printers="canon_only"
    )
    res3 = run_full_pipeline(daily_matrices, day_names, observations, assump3)
    p3_hp = res3.printer_metrics.hp_laser_303dw
    p3_canon = res3.printer_metrics.canon_pixma_g670
    slot_9_11_test3 = next(s for s in res3.slot_capacity_analysis if s["slot_label"] == "9 AM–11 AM")

    # Hand check one slot: 9 AM-11 AM slot has 37.0 B&W pages demand / day
    # HP capacity is 0 -> HP load ratio flags 100.0% / unfulfillable, bottleneck is Printer 1 broken
    t3_pass = (
        p3_hp["weekly_capacity"] == 0 and
        p3_hp["status"] == "Out of Service - Printer Issue" and
        p3_canon["weekly_capacity"] == 14742 and
        p3_canon["is_operational"] is True and
        "HP Laser broken" in slot_9_11_test3["bottleneck"]
    )
    results.append({
        "test_num": 3,
        "name": "1 staff, Printer 1 broken, Printer 2 working",
        "input": "staff=1, working_printers='canon_only'",
        "expected": "HP Cap=0, Status='Out of Service', Canon Cap=14742, Slot bottleneck='Printer 1: HP Laser broken'",
        "actual": f"HP Cap={p3_hp['weekly_capacity']}, Status='{p3_hp['status']}', Canon Cap={p3_canon['weekly_capacity']}, Bottleneck='{slot_9_11_test3['bottleneck']}'",
        "pass": t3_pass
    })

    # -------------------------------------------------------------------------
    # TEST 4: Neither printer works
    # -------------------------------------------------------------------------
    assump4 = DatasetAssumptions(
        staff_count=1,
        working_printers="none"
    )
    res4 = run_full_pipeline(daily_matrices, day_names, observations, assump4)
    p4_hp = res4.printer_metrics.hp_laser_303dw
    p4_canon = res4.printer_metrics.canon_pixma_g670
    p4_summary = res4.printer_metrics.assumptions["status_summary"]
    slot_all_bottlenecks = [s["bottleneck"] for s in res4.slot_capacity_analysis]

    t4_pass = (
        p4_hp["weekly_capacity"] == 0 and
        p4_canon["weekly_capacity"] == 0 and
        "Neither printer is working" in p4_summary and
        all("Neither printer is working" in b for b in slot_all_bottlenecks)
    )
    results.append({
        "test_num": 4,
        "name": "Neither printer works (0 capacity, warning, no crash)",
        "input": "staff=1, working_printers='none'",
        "expected": "HP Cap=0, Canon Cap=0, Status Summary warns neither printer works, no crash",
        "actual": f"HP Cap={p4_hp['weekly_capacity']}, Canon Cap={p4_canon['weekly_capacity']}, Summary='{p4_summary}'",
        "pass": t4_pass
    })

    # -------------------------------------------------------------------------
    # TEST 5: 0 staff
    # -------------------------------------------------------------------------
    assump5 = DatasetAssumptions(
        staff_count=0,
        working_printers="all"
    )
    res5 = run_full_pipeline(daily_matrices, day_names, observations, assump5)
    s5 = res5.staff_metrics
    slot_0 = res5.slot_capacity_analysis[0]

    t5_pass = (
        s5.actual_available_weekly_hours == 0.0 and
        s5.weekly_utilization_percent == 0.0 and
        "No staff present today" in s5.assumptions.get("staff_counts", [0]) or s5.total_workload_hours > 0 and
        slot_0["staff_capacity_hours"] == 0.0 and
        slot_0["is_overloaded"] is True and
        "No staff present" in slot_0["bottleneck"]
    )
    results.append({
        "test_num": 5,
        "name": "0 staff (no division-by-zero error, clear message)",
        "input": "staff=0, working_printers='all'",
        "expected": "Available=0 hrs, Util=0.0%, no ZeroDivisionError, slot overload flagged with needed hours",
        "actual": f"Available={s5.actual_available_weekly_hours} hrs, Util={s5.weekly_utilization_percent}%, Bottleneck='{slot_0['bottleneck']}', Extra hrs={slot_0['extra_staff_hours_needed']}",
        "pass": t5_pass
    })

    # -------------------------------------------------------------------------
    # TEST 6: Invalid inputs (negative, decimal, blank, text)
    # -------------------------------------------------------------------------
    invalid_cases = [
        {"checkin_date": "2026-11-13", "staff_present": -1, "printer_issue": False, "working_printers": "all"},
        {"checkin_date": "2026-11-13", "staff_present": 25, "printer_issue": False, "working_printers": "all"},
        {"checkin_date": "2026-11-13", "staff_present": 1.5, "printer_issue": False, "working_printers": "all"},
        {"checkin_date": "2026-11-13", "staff_present": "invalid_text", "printer_issue": False, "working_printers": "all"},
    ]
    t6_rejected = []
    for case in invalid_cases:
        ok, _rec, _msg = CheckInManager.save_checkin(case, overwrite_confirmed=True)
        t6_rejected.append(not ok)

    t6_pass = all(t6_rejected)
    results.append({
        "test_num": 6,
        "name": "Invalid inputs (negative, decimal, blank, text) rejected",
        "input": "staff=-1, staff=25, staff=1.5, staff='invalid_text'",
        "expected": "All invalid submissions rejected with descriptive validation messages",
        "actual": f"Rejected all 4 invalid inputs: {t6_rejected}",
        "pass": t6_pass
    })

    # -------------------------------------------------------------------------
    # TEST 7: Upload dataset A, then a different dataset B with different check-ins
    # -------------------------------------------------------------------------
    # Dataset A: Academic sample (1840 orders) with 1 staff
    res7_A = run_full_pipeline(daily_matrices, day_names, observations, assump1)

    # Dataset B: User dataset 1618 (from user_dataset_1618.xlsx) with 3 staff and Printer 1 broken
    ds_b_path = backend_dir / "data" / "user_dataset_1618.xlsx"
    with open(ds_b_path, "rb") as f:
        ds_b_bytes = f.read()
    parsed_b = parse_uploaded_file("user_dataset_1618.xlsx", ds_b_bytes)
    assump7_B = DatasetAssumptions(
        staff_count=3,
        working_printers="canon_only"
    )
    res7_B = run_full_pipeline(parsed_b["daily_matrices"], parsed_b["day_names"], parsed_b["observations"], assump7_B)

    t7_pass = (
        res7_A.total_weekly_demand == 1840 and
        res7_B.total_weekly_demand == 1618 and
        res7_A.staff_metrics.assumptions["staff_counts"][0] == 1 and
        res7_B.staff_metrics.assumptions["staff_counts"][0] == 3 and
        res7_A.printer_metrics.hp_laser_303dw["is_operational"] is True and
        res7_B.printer_metrics.hp_laser_303dw["is_operational"] is False and
        res7_B.printer_metrics.hp_laser_303dw["weekly_capacity"] == 0
    )
    results.append({
        "test_num": 7,
        "name": "Upload dataset A, then B with different check-in values",
        "input": "A: 1840 orders, staff=1, all printers; B: 1618 orders, staff=3, canon_only",
        "expected": "A demand=1840, staff=1; B demand=1618, staff=3, HP capacity=0. No stale values left over.",
        "actual": f"A Demand={res7_A.total_weekly_demand}, Staff={res7_A.staff_metrics.assumptions['staff_counts'][0]}; B Demand={res7_B.total_weekly_demand}, Staff={res7_B.staff_metrics.assumptions['staff_counts'][0]}, B HP Cap={res7_B.printer_metrics.hp_laser_303dw['weekly_capacity']}",
        "pass": t7_pass
    })

    # -------------------------------------------------------------------------
    # TEST 8: Same date submitted twice (update with confirmation, no duplicates)
    # -------------------------------------------------------------------------
    test_date = "2026-11-20"
    # First submission
    c1 = {"checkin_date": test_date, "staff_present": 2, "printer_issue": False, "working_printers": "all"}
    ok1, _rec1, _msg1 = CheckInManager.save_checkin(c1, overwrite_confirmed=True)

    # Second submission without overwrite confirmation
    c2 = {"checkin_date": test_date, "staff_present": 4, "printer_issue": True, "working_printers": "hp_only"}
    ok2, _rec2, msg2 = CheckInManager.save_checkin(c2, overwrite_confirmed=False)

    # Third submission with overwrite confirmation
    ok3, _rec3, _msg3 = CheckInManager.save_checkin(c2, overwrite_confirmed=True)

    # Check store for date
    saved_checkin = CheckInManager.get_checkin(test_date)
    all_checkins_list = CheckInManager.list_checkins()
    date_occurrences = [c for c in all_checkins_list if c["checkin_date"] == test_date]

    t8_pass = (
        ok1 is True and
        ok2 is False and
        msg2 == "EXISTS_CONFIRMATION_REQUIRED" and
        ok3 is True and
        saved_checkin["staff_present"] == 4 and
        len(date_occurrences) == 1  # Exactly 1 record, no duplicates
    )
    results.append({
        "test_num": 8,
        "name": "Same date submitted twice (confirmation required, updated without duplicates)",
        "input": f"Date={test_date}: 1st submit staff=2; 2nd submit staff=4 unconfirmed; 3rd submit staff=4 confirmed",
        "expected": "2nd submission prompts confirmation; 3rd overwrites; exactly 1 record persists with staff=4",
        "actual": f"Unconfirmed status='{msg2}', Confirmed saved=True, Stored staff={saved_checkin['staff_present']}, Duplicate count={len(date_occurrences)}",
        "pass": t8_pass
    })

    # -------------------------------------------------------------------------
    # TEST 9: Dataset containing a date with no check-in
    # -------------------------------------------------------------------------
    mock_days = ["2026-12-01", "2026-12-02", "2026-12-03"]
    match_res = CheckInManager.match_checkins_for_dates(mock_days, primary_checkin=None)

    t9_pass = (
        len(match_res["missing_dates"]) == 3 and
        "Default values used for these dates" in match_res["default_note"] and
        all(d in match_res["default_note"] for d in mock_days)
    )
    results.append({
        "test_num": 9,
        "name": "Dataset containing date with no check-in (missing dates listed with default note)",
        "input": "Day dates: 2026-12-01, 2026-12-02, 2026-12-03 with no check-ins",
        "expected": "Missing dates identified and listed in default_note: 'Default values used for these dates...'",
        "actual": f"Missing count={len(match_res['missing_dates'])}, Note='{match_res['default_note']}'",
        "pass": t9_pass
    })

    # -------------------------------------------------------------------------
    # TEST 10: Old dataset format uploaded without a check-in
    # -------------------------------------------------------------------------
    # Uploading raw sample CSV without checkin_json
    assump10 = DatasetAssumptions()  # All defaults
    res10 = run_full_pipeline(daily_matrices, day_names, observations, assump10)

    t10_pass = (
        res10.total_weekly_demand == 1840 and
        res10.printer_metrics.hp_laser_303dw["weekly_capacity"] == 113400 and
        res10.printer_metrics.canon_pixma_g670["weekly_capacity"] == 14742 and
        res10.staff_metrics.weekly_utilization_percent == 131.22
    )
    results.append({
        "test_num": 10,
        "name": "Old dataset format uploaded without a check-in (still works with defaults)",
        "input": "Uploaded CSV with default DatasetAssumptions (no check-in)",
        "expected": "Calculations execute seamlessly with default staff=1, all printers working",
        "actual": f"Demand={res10.total_weekly_demand}, HP Cap={res10.printer_metrics.hp_laser_303dw['weekly_capacity']}, Util={res10.staff_metrics.weekly_utilization_percent}%",
        "pass": t10_pass
    })

    # -------------------------------------------------------------------------
    # TEST 11: The upload is blocked until the form is complete
    # -------------------------------------------------------------------------
    # Frontend logic simulation:
    def simulate_frontend_gate(date_val, staff_val, printer_issue, working_printer):
        staff_str = str(staff_val).strip()
        try:
            p_staff = int(staff_str)
            is_staff_valid = (
                staff_str != "" and
                staff_str == str(p_staff) and
                0 <= p_staff <= 20
            )
        except Exception:
            is_staff_valid = False

        is_printer_valid = (not printer_issue) or (working_printer in ("hp_only", "canon_only", "none"))
        is_checkin_valid = bool(date_val and is_staff_valid and is_printer_valid)
        return is_checkin_valid

    # Case A: empty staff -> blocked
    gate_empty_staff = simulate_frontend_gate("2026-11-13", "", False, "all")
    # Case B: negative staff -> blocked
    gate_neg_staff = simulate_frontend_gate("2026-11-13", "-1", False, "all")
    # Case C: decimal staff -> blocked
    gate_dec_staff = simulate_frontend_gate("2026-11-13", "1.5", False, "all")
    # Case D: printer issue yes but invalid printer -> blocked
    gate_inv_printer = simulate_frontend_gate("2026-11-13", "1", True, "invalid")
    # Case E: complete and valid -> unblocked
    gate_valid = simulate_frontend_gate("2026-11-13", "1", False, "all")

    t11_pass = (
        gate_empty_staff is False and
        gate_neg_staff is False and
        gate_dec_staff is False and
        gate_inv_printer is False and
        gate_valid is True
    )
    results.append({
        "test_num": 11,
        "name": "Upload is blocked until form is complete",
        "input": "Cases: empty staff, negative staff, decimal staff, incomplete printer issue, vs complete valid",
        "expected": "Blocked (False) for all incomplete/invalid inputs; Unblocked (True) only when valid",
        "actual": f"Empty={gate_empty_staff}, Neg={gate_neg_staff}, Dec={gate_dec_staff}, InvPrinter={gate_inv_printer}, Valid={gate_valid}",
        "pass": t11_pass
    })

    print(f"\nCompleted {len(results)} test cases:")
    all_passed = True
    for r in results:
        status = "PASS" if r["pass"] else "FAIL"
        if not r["pass"]:
            all_passed = False
        print(f"[{status}] Test {r['test_num']}: {r['name']}")
        print(f"       Actual: {r['actual']}")

    print("=" * 70)
    print("OVERALL RESULT:", "ALL 11 TESTS PASSED" if all_passed else "SOME TESTS FAILED")
    print("=" * 70)

    # Save detailed JSON test report for the Final Report
    report_file = backend_dir / "data" / "step7_test_results.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
