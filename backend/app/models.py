from typing import Any

from pydantic import BaseModel, Field

from app.config import settings


class DailyObservationInput(BaseModel):
    day_number: int = Field(..., ge=1, le=7)
    day_name: str
    service: str
    slot_9_11: int = Field(..., ge=0)
    slot_11_1: int = Field(..., ge=0)
    slot_1_4: int = Field(..., ge=0)
    slot_4_6: int = Field(..., ge=0)

class ShopCheckInInput(BaseModel):
    checkin_date: str = Field(..., description="Check-in date (YYYY-MM-DD)")
    staff_present: int = Field(default=1, ge=0, le=20, description="Whole number of staff members present")
    printer_issue: bool = Field(default=False, description="Whether any printer issue exists")
    working_printers: str = Field(
        default="all",
        description="'all', 'hp_only', 'canon_only', or 'none'"
    )
    notes: str | None = None
    timestamp: str | None = None

class DatasetAssumptions(BaseModel):
    staff_count: int = Field(default=settings.DEFAULT_STAFF_COUNT, ge=0, le=settings.MAX_STAFF_COUNT)
    daily_operating_hours: float = Field(default=settings.DEFAULT_OPERATING_HOURS, ge=1.0)
    productive_work_factor: float = Field(default=settings.PRODUCTIVE_WORK_FACTOR, ge=0.1, le=2.0)
    working_printers: str = Field(default="all")
    hp_rated_ppm: float = Field(default=settings.HP_RATED_PPM, ge=1.0)
    canon_rated_ipm: float = Field(default=settings.CANON_RATED_IPM, ge=0.5)
    pages_per_order: dict[str, int] = Field(default_factory=lambda: dict(settings.PAGES_PER_ORDER))
    handling_time_min: dict[str, float] = Field(default_factory=lambda: {
        "bw": settings.HANDLING_TIMES_MIN.get("B&W Printing", 2.0),
        "colour": settings.HANDLING_TIMES_MIN.get("Colour Printing", 4.0),
        "binding": settings.HANDLING_TIMES_MIN.get("Binding", 8.0),
        "photocopying": settings.HANDLING_TIMES_MIN.get("Photocopying", 2.0)
    })
    checkin: dict[str, Any] | None = None
    daily_checkins: dict[str, Any] = Field(default_factory=dict)
    daily_schedule: list[dict[str, Any]] = Field(default_factory=list)
    notes: str | None = None
    operational_notes: str | None = None

class PrinterMetrics(BaseModel):
    hp_laser_303dw: dict[str, Any]
    canon_pixma_g670: dict[str, Any]
    photocopying_standalone: dict[str, Any] | None = None
    assumptions: dict[str, Any]

class StaffMetrics(BaseModel):
    scheduled_availability_weekly_hours: float
    actual_available_weekly_hours: float
    total_workload_minutes: float
    total_workload_hours: float
    weekly_utilization_percent: float
    daily_breakdown: list[dict[str, Any]]
    assumptions: dict[str, Any]

class AdvancedAnalysisResult(BaseModel):
    matrix_rank: int
    mean_vector: dict[str, float]
    covariance_matrix: dict[str, dict[str, float]]
    correlation_matrix: dict[str, dict[str, float]]
    eigenvalues: list[float]
    variance_explained: list[float]
    eigenvectors: list[list[float]]
    dominant_direction: str

class BusinessRecommendation(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str

class CalculationResult(BaseModel):
    total_weekly_demand: int
    average_daily_demand: float
    top_service: dict[str, Any]
    peak_time_slot: dict[str, Any]
    weekly_matrix: list[list[int]]
    average_daily_matrix: list[list[float]]
    service_totals: dict[str, int]
    service_percentages: dict[str, float]
    timeslot_totals: dict[str, int]
    duration_adjusted_rates: dict[str, float]
    daily_totals: list[dict[str, Any]]
    busiest_day: dict[str, Any]
    least_busy_day: dict[str, Any]
    printer_metrics: PrinterMetrics
    staff_metrics: StaffMetrics
    advanced_analysis: AdvancedAnalysisResult
    recommendations: list[BusinessRecommendation]
    slot_capacity_analysis: list[dict[str, Any]] | None = None
    checkin_summary: dict[str, Any] | None = None

class DatasetResponse(BaseModel):
    id: str
    dataset_name: str
    week_label: str | None = None
    created_at: str
    total_demand: int
    calculations: CalculationResult
    assumptions: DatasetAssumptions

class WeekComparisonItem(BaseModel):
    dataset_id: str
    dataset_name: str
    week_label: str | None = None
    total_demand: int
    average_daily_demand: float
    peak_time_slot: str
    top_service: str
    busiest_day: str
    hp_load_ratio: float
    canon_load_ratio: float
    staff_utilization: float

class WeekComparisonResponse(BaseModel):
    datasets: list[WeekComparisonItem]
    absolute_differences: dict[str, Any]
    percentage_differences: dict[str, Any]
    summary_insights: list[str]
