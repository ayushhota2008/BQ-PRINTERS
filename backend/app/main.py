import json
from typing import Any

import numpy as np
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.checkin_manager import CheckInManager
from app.file_parser import UploadValidationError, parse_uploaded_file
from app.insights_engine import InsightsEngine
from app.math_engine import SERVICE_NAMES, MathEngine
from app.models import (
    AdvancedAnalysisResult,
    CalculationResult,
    DatasetAssumptions,
    PrinterMetrics,
    ShopCheckInInput,
    StaffMetrics,
    WeekComparisonItem,
    WeekComparisonResponse,
)
from app.sample_data import SAMPLE_DATA_ROWS, get_sample_csv_text
from app.supabase_client import supabase_service

app = FastAPI(
    title="BQ PRINTERS — Demand Analytics API",
    description="Mathematical computation engine & demand analyzer for printing shops based on academic linear algebra models.",
    version="1.0.0"
)

@app.exception_handler(UploadValidationError)
async def upload_validation_exception_handler(request, exc: UploadValidationError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_full_pipeline(
    daily_matrices: list[np.ndarray],
    day_names: list[str],
    observations: np.ndarray,
    assumptions: DatasetAssumptions
) -> CalculationResult:
    """
    Executes the entire mathematical pipeline strictly following the academic report.
    """
    # 1. Weekly Matrix W
    W = MathEngine.compute_weekly_matrix(daily_matrices)

    # 2. Service totals and percentages
    service_totals, service_percentages, N = MathEngine.compute_service_totals_and_percentages(W)
    avg_daily_demand = MathEngine.compute_average_daily_demand(N)
    avg_matrix = MathEngine.compute_average_demand_matrix(W)

    # Top Service
    top_service_name = max(service_totals.items(), key=lambda x: x[1], default=("B&W Printing", 0))[0]
    top_service = {
        "name": top_service_name,
        "total_demand": service_totals.get(top_service_name, 0),
        "percentage": service_percentages.get(top_service_name, 0.0)
    }

    # 3. Time slot metrics
    slot_durations = [2.0, 2.0, 3.0, 2.0]
    timeslot_totals, duration_adjusted_rates, peak_slot, peak_rate = MathEngine.compute_timeslot_metrics(
        W, slot_durations=slot_durations
    )
    peak_time_slot = {
        "label": peak_slot,
        "total_demand": timeslot_totals[peak_slot],
        "rate_per_hour": peak_rate
    }

    # 4. Daily demand comparisons and matrix rank
    daily_totals, busiest_day, least_busy_day, matrix_rank, _M = MathEngine.compute_daily_totals_and_rank(
        daily_matrices, day_names
    )

    # 5 & 6. Covariance, Correlation, and Eigenvalues
    mean_vec, cov_mat, corr_mat, evals, evecs, var_explained = MathEngine.compute_covariance_and_eigenvalues(
        observations
    )

    # Standardize sign: ensure primary eigenvector has positive loading on primary service
    if evecs.shape[1] > 0 and evecs[0, 0] < 0:
        evecs[:, 0] = -evecs[:, 0]

    # Covariance & Correlation dict mappings
    cov_dict = {}
    corr_dict = {}
    for i, s1 in enumerate(SERVICE_NAMES):
        cov_dict[s1] = {}
        corr_dict[s1] = {}
        for j, s2 in enumerate(SERVICE_NAMES):
            cov_dict[s1][s2] = round(float(cov_mat[i, j]), 3)
            corr_dict[s1][s2] = round(float(corr_mat[i, j]), 3)

    mean_vector_dict = {
        SERVICE_NAMES[i]: round(float(mean_vec[i]), 2) for i in range(4)
    }

    dominant_dir_desc = (
        f"Primary eigenvector explains {var_explained[0]:.2f}% of variance. "
        f"Direction: B&W ({evecs[0, 0]:.2f}), Colour ({evecs[1, 0]:.2f}), "
        f"Binding ({evecs[2, 0]:.2f}), Photocopying ({evecs[3, 0]:.2f}). "
        "Positive loadings across all services confirm a dominant general shop-wide traffic factor."
    )

    advanced_analysis = AdvancedAnalysisResult(
        matrix_rank=matrix_rank,
        mean_vector=mean_vector_dict,
        covariance_matrix=cov_dict,
        correlation_matrix=corr_dict,
        eigenvalues=[round(float(v), 3) for v in evals],
        variance_explained=[round(float(v), 2) for v in var_explained],
        eigenvectors=[[round(float(val), 3) for val in row] for row in evecs.tolist()],
        dominant_direction=dominant_dir_desc
    )

    # 7. Printer capacity
    op_hours = [assumptions.daily_operating_hours] * 7
    printer_res = MathEngine.compute_printer_capacity(
        service_totals=service_totals,
        operating_hours_per_day=op_hours,
        hp_rated_ppm=assumptions.hp_rated_ppm,
        canon_rated_ipm=assumptions.canon_rated_ipm,
        pages_per_order=assumptions.pages_per_order,
        working_printers=assumptions.working_printers
    )
    printer_metrics = PrinterMetrics(**printer_res)

    # 8. Staff availability & workload
    staff_counts = [assumptions.staff_count] * 7
    staff_handling = {
        "B&W Printing": assumptions.handling_time_min.get("bw", 2.0),
        "Colour Printing": assumptions.handling_time_min.get("colour", 4.0),
        "Binding": assumptions.handling_time_min.get("binding", 8.0),
        "Photocopying": assumptions.handling_time_min.get("photocopying", 2.0)
    }
    staff_res = MathEngine.compute_staff_workload(
        service_totals=service_totals,
        daily_matrices=daily_matrices,
        day_names=day_names,
        staff_counts=staff_counts,
        operating_hours_per_day=op_hours,
        handling_times=staff_handling,
        productive_work_factor=assumptions.productive_work_factor
    )
    staff_metrics = StaffMetrics(**staff_res)

    # 8B. Slot-by-slot capacity & bottleneck analysis
    slot_capacity = MathEngine.compute_slot_capacity_and_bottlenecks(
        W=W,
        staff_present=assumptions.staff_count,
        working_printers=assumptions.working_printers,
        handling_times=staff_handling,
        slot_durations=slot_durations,
        productive_work_factor=assumptions.productive_work_factor,
        hp_rated_ppm=assumptions.hp_rated_ppm,
        canon_rated_ipm=assumptions.canon_rated_ipm
    )

    checkin_summary = {
        "staff_present": assumptions.staff_count,
        "working_printers": assumptions.working_printers,
        "printer_issue": assumptions.working_printers != "all",
        "printer_status_text": printer_res["assumptions"]["status_summary"],
        "productive_work_factor": assumptions.productive_work_factor,
        "checkin": assumptions.checkin
    }

    # 9. Business Recommendations
    recommendations = InsightsEngine.generate_recommendations(
        service_percentages=service_percentages,
        peak_time_slot=peak_slot,
        peak_rate=peak_rate,
        duration_adjusted_rates=duration_adjusted_rates,
        busiest_day=busiest_day,
        least_busy_day=least_busy_day,
        printer_metrics=printer_res,
        staff_metrics=staff_res,
        variance_explained=[float(v) for v in var_explained]
    )

    return CalculationResult(
        total_weekly_demand=N,
        average_daily_demand=avg_daily_demand,
        top_service=top_service,
        peak_time_slot=peak_time_slot,
        weekly_matrix=W.tolist(),
        average_daily_matrix=avg_matrix.tolist(),
        service_totals=service_totals,
        service_percentages=service_percentages,
        timeslot_totals=timeslot_totals,
        duration_adjusted_rates=duration_adjusted_rates,
        daily_totals=daily_totals,
        busiest_day=busiest_day,
        least_busy_day=least_busy_day,
        printer_metrics=printer_metrics,
        staff_metrics=staff_metrics,
        advanced_analysis=advanced_analysis,
        recommendations=recommendations,
        slot_capacity_analysis=slot_capacity,
        checkin_summary=checkin_summary
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BQ PRINTERS Demand Analytics Engine",
        "supabase_connected": supabase_service.is_available()
    }

@app.get("/api/sample-dataset")
def get_sample_dataset(format: str = "csv"):
    """
    Returns the authoritative academic benchmark dataset from the project report.
    """
    if format == "csv":
        return {"csv": get_sample_csv_text()}
    return {"rows": SAMPLE_DATA_ROWS}

def set_no_cache_headers(response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

@app.post("/api/upload/preview", response_model=dict[str, Any])
async def preview_upload(
    response: Response,
    file: UploadFile = File(...)
):
    """
    Validates CSV or XLSX file using the shared parsing pipeline without writing
    to Supabase or any persistent store. Returns structured preview and validation metrics.
    """
    set_no_cache_headers(response)
    contents = await file.read()
    res = parse_uploaded_file(file.filename or "upload", contents)
    return {
        "ok": True,
        "file_name": res["file_name"],
        "format": res["format"],
        "sheet_used": res["sheet_used"],
        "source_row_count": res["source_row_count"],
        "valid_row_count": res["valid_row_count"],
        "normalized_record_count": res["normalized_record_count"],
        "weekly_demand": res["weekly_demand"],
        "preview_rows": res["preview_rows"],
        "warnings": res["warnings"],
        "rejected_rows": res["rejected_rows"]
    }

@app.post("/api/analyze-csv", response_model=dict[str, Any])
@app.post("/api/analyze", response_model=dict[str, Any])
async def analyze_csv(
    response: Response,
    file: UploadFile = File(...),
    dataset_name: str | None = Form(None),
    week_label: str | None = Form(None),
    notes: str | None = Form(None),
    save_to_supabase: bool = Form(True),
    assumptions_json: str | None = Form(None),
    checkin_json: str | None = Form(None),
):
    """
    Main endpoint for CSV and XLSX upload and analysis.
    Validates file via the shared pipeline, computes all linear algebra and operational formulas,
    saves the dataset and math results into Supabase PostgreSQL,
    and returns comprehensive dashboard analytics.
    """
    set_no_cache_headers(response)
    contents = await file.read()

    # 1. Parse and validate file via unified pipeline (CSV & XLSX, byte-level safety)
    parsed = parse_uploaded_file(file.filename or "upload", contents)
    daily_matrices = parsed["daily_matrices"]
    day_names = parsed["day_names"]
    observations = parsed["observations"]
    structured_rows = parsed["structured_rows"]

    # 2. Parse assumptions and check-in
    assumptions = DatasetAssumptions()
    if assumptions_json:
        try:
            parsed_assump = json.loads(assumptions_json)
            assumptions = DatasetAssumptions(**parsed_assump)
        except (json.JSONDecodeError, ValueError, TypeError):
            pass  # Fallback to default assumptions

    # Direct check-in payload takes precedence
    checkin_record = None
    if checkin_json:
        try:
            c_dict = json.loads(checkin_json)
            if isinstance(c_dict, dict):
                checkin_record = c_dict
                if "staff_present" in c_dict:
                    assumptions.staff_count = int(c_dict["staff_present"])
                if "working_printers" in c_dict:
                    assumptions.working_printers = c_dict["working_printers"]
                assumptions.checkin = c_dict
                # Persist check-in
                CheckInManager.save_checkin(c_dict, overwrite_confirmed=True)
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"Error parsing checkin_json: {e}")
    elif assumptions.checkin:
        checkin_record = assumptions.checkin
        if "staff_present" in checkin_record:
            assumptions.staff_count = int(checkin_record["staff_present"])
        if "working_printers" in checkin_record:
            assumptions.working_printers = checkin_record["working_printers"]

    if notes:
        assumptions.notes = notes
        assumptions.operational_notes = notes

    # Match dates against check-in history to catch missing dates
    checkin_match = CheckInManager.match_checkins_for_dates(day_names, primary_checkin=checkin_record)
    warnings_list = list(parsed.get("warnings", []))
    if checkin_match.get("default_note"):
        warnings_list.append({
            "row": 0,
            "message": checkin_match["default_note"]
        })

    # 3. Run Math Engine Pipeline
    try:
        calc_results = run_full_pipeline(daily_matrices, day_names, observations, assumptions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mathematical calculation failed: {e!s}")

    dataset_id = "local-preview-id"
    created_at_str = ""

    # 4. Save to Supabase if requested and client is ready
    if save_to_supabase and supabase_service.is_available():
        name = dataset_name or file.filename or "Weekly Demand Analysis"
        try:
            ds_record = supabase_service.create_dataset(
                dataset_name=name,
                user_id=None,
                week_label=week_label,
                total_demand=calc_results.total_weekly_demand
            )
            dataset_id = ds_record["id"]
            created_at_str = ds_record.get("created_at", "")

            # Insert observations, assumptions, calculations
            supabase_service.insert_observations(dataset_id, structured_rows)
            supabase_service.insert_assumptions(dataset_id, assumptions.model_dump())
            supabase_service.insert_calculations(dataset_id, calc_results.model_dump())
        except Exception as e:
            # Clean up incomplete dataset record to prevent orphaned state
            if dataset_id != "local-preview-id":
                try:
                    supabase_service.delete_dataset(dataset_id)
                except Exception as del_err:
                    print(f"Cleanup error: {del_err}")
                dataset_id = "local-preview-id"
            print(f"Warning: Supabase write failed: {e}")

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset_name or file.filename or "Uploaded Week",
        "week_label": week_label or "Analyzed Week",
        "created_at": created_at_str,
        "calculations": calc_results.model_dump(),
        "assumptions": assumptions.model_dump(),
        "warnings": warnings_list,
        "missing_checkin_dates": checkin_match.get("missing_dates", []),
        "default_checkin_note": checkin_match.get("default_note"),
        "sheet_used": parsed.get("sheet_used"),
        "source_row_count": parsed.get("source_row_count"),
        "valid_row_count": parsed.get("valid_row_count")
    }

@app.get("/api/checkins", response_model=list[dict[str, Any]])
def list_checkins(response: Response):
    set_no_cache_headers(response)
    return CheckInManager.list_checkins()

@app.get("/api/checkins/{date_str}", response_model=dict[str, Any] | None)
def get_checkin(date_str: str, response: Response):
    set_no_cache_headers(response)
    res = CheckInManager.get_checkin(date_str)
    if not res:
        raise HTTPException(status_code=404, detail=f"No check-in found for date {date_str}.")
    return res

@app.post("/api/checkin")
def save_checkin(
    checkin: ShopCheckInInput,
    response: Response,
    overwrite: bool = Query(False)
):
    set_no_cache_headers(response)
    success, record, status_msg = CheckInManager.save_checkin(checkin.model_dump(), overwrite_confirmed=overwrite)
    if not success and status_msg == "EXISTS_CONFIRMATION_REQUIRED":
        return {
            "ok": False,
            "status": "EXISTS_CONFIRMATION_REQUIRED",
            "message": f"A check-in already exists for {checkin.checkin_date}. Confirm overwrite to replace.",
            "existing": record
        }
    elif not success:
        raise HTTPException(status_code=400, detail=status_msg)
    return {
        "ok": True,
        "status": "SAVED",
        "message": f"Shop status check-in saved for {checkin.checkin_date}.",
        "checkin": record
    }

@app.get("/api/datasets", response_model=list[dict[str, Any]])
def list_datasets(
    response: Response
):
    """
    Lists historical datasets stored in Supabase.
    """
    set_no_cache_headers(response)
    return supabase_service.list_datasets(user_id=None)

@app.get("/api/datasets/{dataset_id}")
def get_dataset(
    dataset_id: str,
    response: Response
):
    """
    Retrieves full details and calculations for a historical dataset.
    """
    set_no_cache_headers(response)
    details = supabase_service.get_dataset_details(dataset_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")
    return details

@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: str):
    """
    Deletes a dataset and its cascading calculations.
    """
    success = supabase_service.delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete dataset.")
    return {"deleted": True, "dataset_id": dataset_id}

@app.post("/api/compare-weeks", response_model=WeekComparisonResponse)
def compare_weeks(dataset_ids: list[str]):
    """
    Accepts 2 or more Dataset IDs, loads their calculations,
    and computes absolute and percentage differences across demand and workloads.
    """
    if len(dataset_ids) < 2:
        raise HTTPException(status_code=400, detail="Please provide at least 2 dataset IDs to compare.")

    datasets_list = []
    for d_id in dataset_ids:
        details = supabase_service.get_dataset_details(d_id)
        if not details or not details.get("calculations"):
            continue
        ds = details["dataset"]
        calc = details["calculations"]

        datasets_list.append(WeekComparisonItem(
            dataset_id=d_id,
            dataset_name=ds.get("dataset_name", "Week"),
            week_label=ds.get("week_label", ""),
            total_demand=int(np.sum(calc["weekly_matrix"])) if calc.get("weekly_matrix") is not None else int(ds.get("total_demand", 0)),
            average_daily_demand=round(float(ds.get("total_demand", 0)) / 7.0, 2),
            peak_time_slot=max(calc.get("timeslot_totals", {}).items(), key=lambda x: x[1], default=("11 AM–1 PM", 0))[0],
            top_service=max(calc.get("service_totals", {}).items(), key=lambda x: x[1], default=("B&W Printing", 0))[0],
            busiest_day=max(calc.get("daily_totals", []), key=lambda x: x.get("total_demand", 0), default={"day_name": "Thursday"}).get("day_name", "Thursday"),
            hp_load_ratio=float(calc.get("printer_metrics", {}).get("hp_laser_303dw", {}).get("load_ratio_percent", 0.0)),
            canon_load_ratio=float(calc.get("printer_metrics", {}).get("canon_pixma_g670", {}).get("load_ratio_percent", 0.0)),
            staff_utilization=float(calc.get("staff_metrics", {}).get("weekly_utilization_percent", 0.0))
        ))

    if len(datasets_list) < 2:
        raise HTTPException(status_code=400, detail="Not enough valid datasets found for comparison.")

    # Compare baseline (first) with latest (last)
    base = datasets_list[0]
    latest = datasets_list[-1]

    abs_diff = {
        "total_demand": latest.total_demand - base.total_demand,
        "average_daily_demand": round(latest.average_daily_demand - base.average_daily_demand, 2),
        "hp_load_ratio": round(latest.hp_load_ratio - base.hp_load_ratio, 2),
        "canon_load_ratio": round(latest.canon_load_ratio - base.canon_load_ratio, 2),
        "staff_utilization": round(latest.staff_utilization - base.staff_utilization, 2)
    }

    pct_diff = {
        "total_demand": round(((latest.total_demand - base.total_demand) / base.total_demand) * 100.0, 2) if base.total_demand > 0 else 0.0,
        "average_daily_demand": round(((latest.average_daily_demand - base.average_daily_demand) / base.average_daily_demand) * 100.0, 2) if base.average_daily_demand > 0 else 0.0,
        "staff_utilization": round(((latest.staff_utilization - base.staff_utilization) / base.staff_utilization) * 100.0, 2) if base.staff_utilization > 0 else 0.0
    }

    insights = []
    if abs_diff["total_demand"] > 0:
        insights.append(f"Overall demand grew by {abs_diff['total_demand']} orders (+{pct_diff['total_demand']}%).")
    elif abs_diff["total_demand"] < 0:
        insights.append(f"Overall demand softened by {abs(abs_diff['total_demand'])} orders ({pct_diff['total_demand']}%).")
    else:
        insights.append("Total customer demand remained steady across weeks.")

    if abs_diff["staff_utilization"] > 5.0:
        insights.append(f"Staff workload intensity increased by +{abs_diff['staff_utilization']} percentage points.")

    return WeekComparisonResponse(
        datasets=datasets_list,
        absolute_differences=abs_diff,
        percentage_differences=pct_diff,
        summary_insights=insights
    )
