import logging
from typing import Any

from supabase import Client, create_client

from app.config import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.client: Client | None = None
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_KEY:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def create_dataset(
        self,
        dataset_name: str,
        user_id: str | None = None,
        week_label: str | None = None,
        total_demand: int = 0,
        start_date: str | None = None,
        end_date: str | None = None
    ) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("Supabase client is not configured.")

        payload = {
            "dataset_name": dataset_name,
            "week_label": week_label,
            "total_demand": total_demand,
            "validation_status": "valid"
        }
        if user_id:
            payload["user_id"] = user_id
        if start_date:
            payload["start_date"] = start_date
        if end_date:
            payload["end_date"] = end_date

        res = self.client.table("datasets").insert(payload).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        raise RuntimeError("Failed to create dataset in Supabase.")

    def insert_observations(self, dataset_id: str, observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Supabase client is not configured.")

        rows = []
        for obs in observations:
            row = {
                "dataset_id": dataset_id,
                "day_number": obs["day_number"],
                "day_name": obs["day_name"],
                "service": obs["service"],
                "slot_9_11": obs["slot_9_11"],
                "slot_11_1": obs["slot_11_1"],
                "slot_1_4": obs["slot_1_4"],
                "slot_4_6": obs["slot_4_6"]
            }
            rows.append(row)

        res = self.client.table("observations").insert(rows).execute()
        return res.data

    def insert_assumptions(self, dataset_id: str, assumptions: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("Supabase client is not configured.")

        payload = {
            "dataset_id": dataset_id,
            "staff_count": assumptions.get("staff_count", 3),
            "daily_operating_hours": assumptions.get("daily_operating_hours", 9.0),
            "hp_rated_ppm": assumptions.get("hp_rated_ppm", 30.0),
            "canon_rated_ipm": assumptions.get("canon_rated_ipm", 3.9),
            "pages_per_order": assumptions.get("pages_per_order", {}),
            "handling_time_min": assumptions.get("handling_time_min", {}),
            "daily_schedule": assumptions.get("daily_schedule", [])
        }
        res = self.client.table("assumptions").insert(payload).execute()
        return res.data[0] if res.data else {}

    def insert_calculations(self, dataset_id: str, calc_dict: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("Supabase client is not configured.")

        payload = {
            "dataset_id": dataset_id,
            "weekly_matrix": calc_dict["weekly_matrix"],
            "average_daily_matrix": calc_dict["average_daily_matrix"],
            "service_totals": calc_dict["service_totals"],
            "service_percentages": calc_dict["service_percentages"],
            "timeslot_totals": calc_dict["timeslot_totals"],
            "duration_adjusted_rates": calc_dict["duration_adjusted_rates"],
            "daily_totals": calc_dict["daily_totals"],
            "matrix_rank": calc_dict["advanced_analysis"]["matrix_rank"],
            "mean_vector": calc_dict["advanced_analysis"]["mean_vector"],
            "covariance_matrix": calc_dict["advanced_analysis"]["covariance_matrix"],
            "correlation_matrix": calc_dict["advanced_analysis"]["correlation_matrix"],
            "eigenvalues": calc_dict["advanced_analysis"]["eigenvalues"],
            "eigenvectors": calc_dict["advanced_analysis"]["eigenvectors"],
            "variance_explained": calc_dict["advanced_analysis"]["variance_explained"],
            "printer_metrics": calc_dict["printer_metrics"],
            "staff_metrics": calc_dict["staff_metrics"],
            "recommendations": [r.model_dump() if hasattr(r, 'model_dump') else (r.dict() if hasattr(r, 'dict') else r) for r in calc_dict["recommendations"]]
        }
        res = self.client.table("calculations").insert(payload).execute()
        return res.data[0] if res.data else {}

    def list_datasets(self, user_id: str | None = None) -> list[dict[str, Any]]:
        if not self.client:
            return []

        query = self.client.table("datasets").select("*").order("created_at", desc=True)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        return res.data or []

    def get_dataset_details(self, dataset_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None

        # Fetch dataset, calculations, assumptions, and observations
        ds_res = self.client.table("datasets").select("*").eq("id", dataset_id).execute()
        if not ds_res.data:
            return None
        dataset = ds_res.data[0]

        calc_res = self.client.table("calculations").select("*").eq("dataset_id", dataset_id).execute()
        assump_res = self.client.table("assumptions").select("*").eq("dataset_id", dataset_id).execute()
        obs_res = self.client.table("observations").select("*").eq("dataset_id", dataset_id).order("day_number").execute()

        calculations = calc_res.data[0] if calc_res.data else None
        assumptions = assump_res.data[0] if assump_res.data else None
        observations = obs_res.data or []

        if calculations:
            total_demand = dataset.get("total_demand") or sum(calculations.get("service_totals", {}).values())
            calculations["total_weekly_demand"] = total_demand
            calculations["average_daily_demand"] = round(float(total_demand) / 7.0, 2) if total_demand else 0.0

            if "top_service" not in calculations and calculations.get("service_totals"):
                top_name = max(calculations["service_totals"].items(), key=lambda x: x[1])[0]
                top_val = calculations["service_totals"][top_name]
                calculations["top_service"] = {
                    "name": top_name,
                    "total_demand": top_val,
                    "percentage": round((top_val / total_demand * 100), 2) if total_demand else 0.0
                }

            if "peak_time_slot" not in calculations and calculations.get("timeslot_totals"):
                peak_slot = max(calculations["timeslot_totals"].items(), key=lambda x: x[1])[0]
                calculations["peak_time_slot"] = {
                    "label": peak_slot,
                    "total_demand": calculations["timeslot_totals"][peak_slot],
                    "rate_per_hour": calculations.get("duration_adjusted_rates", {}).get(peak_slot, 0.0)
                }

            if "busiest_day" not in calculations and calculations.get("daily_totals"):
                calculations["busiest_day"] = max(calculations["daily_totals"], key=lambda x: x.get("total_demand", 0))

            if "least_busy_day" not in calculations and calculations.get("daily_totals"):
                calculations["least_busy_day"] = min(calculations["daily_totals"], key=lambda x: x.get("total_demand", 0))

            if "advanced_analysis" not in calculations:
                var_exp = calculations.get("variance_explained", [94.47])
                calculations["advanced_analysis"] = {
                    "matrix_rank": calculations.get("matrix_rank", 7),
                    "mean_vector": calculations.get("mean_vector", {}),
                    "covariance_matrix": calculations.get("covariance_matrix", {}),
                    "correlation_matrix": calculations.get("correlation_matrix", {}),
                    "eigenvalues": calculations.get("eigenvalues", []),
                    "eigenvectors": calculations.get("eigenvectors", []),
                    "variance_explained": var_exp,
                    "dominant_direction": f"Primary eigenvector explains {var_exp[0] if var_exp else 94.47}% of total variance across services."
                }

            if "slot_capacity_analysis" not in calculations and calculations.get("weekly_matrix"):
                import numpy as np

                from app.math_engine import MathEngine
                W_mat = np.array(calculations["weekly_matrix"])
                s_count = assumptions.get("staff_count", 1) if assumptions else 1
                w_printers = assumptions.get("working_printers", "all") if assumptions else "all"
                calculations["slot_capacity_analysis"] = MathEngine.compute_slot_capacity_and_bottlenecks(
                    W=W_mat,
                    staff_present=s_count,
                    working_printers=w_printers
                )

        return {
            "dataset": dataset,
            "calculations": calculations,
            "assumptions": assumptions,
            "observations": observations
        }

    def delete_dataset(self, dataset_id: str) -> bool:
        if not self.client:
            return False
        try:
            self.client.table("calculations").delete().eq("dataset_id", dataset_id).execute()
            self.client.table("assumptions").delete().eq("dataset_id", dataset_id).execute()
            self.client.table("observations").delete().eq("dataset_id", dataset_id).execute()
            self.client.table("datasets").delete().eq("id", dataset_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete dataset {dataset_id}: {e}")
            return False

supabase_service = SupabaseService()
