from typing import Any

import numpy as np

SERVICE_NAMES = [
    "B&W Printing",
    "Colour Printing",
    "Binding",
    "Photocopying"
]

TIME_SLOT_LABELS = [
    "9 AM–11 AM",
    "11 AM–1 PM",
    "1 PM–4 PM",
    "4 PM–6 PM"
]

DEFAULT_SLOT_DURATIONS = [2.0, 2.0, 3.0, 2.0]  # in hours

class MathEngine:
    """
    Authoritative Mathematical Engine for BQ PRINTERS Demand Analytics.
    Implements all formulas strictly from the academic project report:
    'Printing Shop Demand Analyzer' using NumPy and linear algebra.
    """

    @staticmethod
    def compute_weekly_matrix(daily_matrices: list[np.ndarray]) -> np.ndarray:
        """
        Step 1: Weekly demand matrix:
        W = \\sum_{d=1}^7 D_d
        Shape: (4, 4)
        """
        if len(daily_matrices) != 7:
            raise ValueError(f"Expected 7 daily matrices, got {len(daily_matrices)}")

        W = np.zeros((4, 4), dtype=int)
        for D_d in daily_matrices:
            if D_d.shape != (4, 4):
                raise ValueError(f"Each daily matrix must be 4x4, got {D_d.shape}")
            W += D_d
        return W

    @staticmethod
    def compute_service_totals_and_percentages(W: np.ndarray) -> tuple[dict[str, int], dict[str, float], int]:
        """
        Step 2: Service totals R_i and percentage demand P_i
        R_i = \\sum_{j=1}^4 W_{ij}
        N = \\sum_{i=1}^4 R_i
        P_i = (R_i / N) * 100%
        """
        row_totals = np.sum(W, axis=1)
        N = int(np.sum(W))
        if N == 0:
            return {s: 0 for s in SERVICE_NAMES}, {s: 0.0 for s in SERVICE_NAMES}, 0

        service_totals = {}
        service_percentages = {}
        for idx, s_name in enumerate(SERVICE_NAMES):
            total_val = int(row_totals[idx])
            service_totals[s_name] = total_val
            service_percentages[s_name] = round((total_val / N) * 100.0, 2)

        return service_totals, service_percentages, N

    @staticmethod
    def compute_average_daily_demand(N: int) -> float:
        """
        Step 2: Average daily demand:
        \\bar{N} = N / 7
        """
        return round(N / 7.0, 2)

    @staticmethod
    def compute_average_demand_matrix(W: np.ndarray) -> np.ndarray:
        """
        Step 2: Average demand matrix:
        \\bar{D} = W / 7
        """
        return np.round(W / 7.0, 2)

    @staticmethod
    def compute_timeslot_metrics(
        W: np.ndarray,
        slot_durations: list[float] = DEFAULT_SLOT_DURATIONS
    ) -> tuple[dict[str, int], dict[str, float], str, float]:
        """
        Step 3: Column totals C_j and duration-adjusted demand rates Q_j:
        C_j = \\sum_{i=1}^4 W_{ij}
        C_{max} = max_{j} C_j
        Q_j = C_j / (7 * h_j) where h_j is the duration in hours
        """
        col_totals = np.sum(W, axis=0)
        timeslot_totals = {}
        duration_adjusted_rates = {}

        for j, slot in enumerate(TIME_SLOT_LABELS):
            c_val = int(col_totals[j])
            h_j = slot_durations[j]
            timeslot_totals[slot] = c_val
            # Duration-adjusted rate across 7 days
            q_val = round(c_val / (7.0 * h_j), 2)
            duration_adjusted_rates[slot] = q_val

        # Peak time slot based on total demand
        peak_idx = int(np.argmax(col_totals))
        peak_slot = TIME_SLOT_LABELS[peak_idx]
        peak_rate = duration_adjusted_rates[peak_slot]

        return timeslot_totals, duration_adjusted_rates, peak_slot, peak_rate

    @staticmethod
    def compute_daily_totals_and_rank(
        daily_matrices: list[np.ndarray],
        day_names: list[str]
    ) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any], int, np.ndarray]:
        """
        Step 4: Daily totals N_d, max and min daily demands, 7x16 matrix M, and rank(M).
        N_d = \\sum_{i=1}^4 \\sum_{j=1}^4 (D_d)_{ij}
        M = [row_1; ...; row_7]_{7 x 16}
        rank(M)
        """
        daily_totals = []
        rows_for_M = []

        for d_idx, D_d in enumerate(daily_matrices):
            tot = int(np.sum(D_d))
            d_name = day_names[d_idx] if d_idx < len(day_names) else f"Day {d_idx + 1}"
            daily_totals.append({
                "day_number": d_idx + 1,
                "day_name": d_name,
                "total_demand": tot
            })
            rows_for_M.append(D_d.flatten())

        M = np.array(rows_for_M, dtype=float)
        matrix_rank = int(np.linalg.matrix_rank(M))

        totals_array = [d["total_demand"] for d in daily_totals]
        max_idx = int(np.argmax(totals_array))
        min_idx = int(np.argmin(totals_array))

        busiest_day = daily_totals[max_idx]
        least_busy_day = daily_totals[min_idx]

        return daily_totals, busiest_day, least_busy_day, matrix_rank, M

    @staticmethod
    def compute_covariance_and_eigenvalues(
        observations: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Step 5 & 6:
        Observation vectors x_n = [b_n, c_n, g_n, p_n]^T for n=1..28 (7 days * 4 slots)
        Mean vector: \\bar{x} = (1 / 28) \\sum x_n
        Sample covariance matrix: S = (1 / 27) \\sum (x_n - \\bar{x})(x_n - \\bar{x})^T
        Correlation matrix: R_{ik} = S_{ik} / sqrt(S_{ii} * S_{kk})
        Eigenvalues: det(S - \\lambda I) = 0
        Eigenvectors: S = P \\Lambda P^T
        Variance explained: E_k = (\\lambda_k / \\sum \\lambda_j) * 100%
        """
        if observations.shape != (28, 4):
            raise ValueError(f"Expected observations shape (28, 4), got {observations.shape}")

        # Mean vector (4,)
        mean_vec = np.mean(observations, axis=0)

        # Sample covariance with ddof=1 (N-1 in denominator)
        cov_matrix = np.cov(observations, rowvar=False, ddof=1)

        # Correlation matrix
        corr_matrix = np.corrcoef(observations, rowvar=False)

        # Eigenvalue decomposition for symmetric real matrix
        evals, evecs = np.linalg.eigh(cov_matrix)

        # Sort descending
        idx_sorted = np.argsort(evals)[::-1]
        sorted_evals = evals[idx_sorted]
        sorted_evecs = evecs[:, idx_sorted]

        # Variance explained
        total_variance = np.sum(sorted_evals)
        if total_variance > 0:
            var_explained = (sorted_evals / total_variance) * 100.0
        else:
            var_explained = np.zeros_like(sorted_evals)

        return mean_vec, cov_matrix, corr_matrix, sorted_evals, sorted_evecs, var_explained

    @staticmethod
    def compute_printer_capacity(
        service_totals: dict[str, int],
        operating_hours_per_day: list[float],
        hp_rated_ppm: float = 30.0,
        canon_rated_ipm: float = 3.9,
        pages_per_order: dict[str, int] | None = None,
        working_printers: str = "all"
    ) -> dict[str, Any]:
        """
        Step 3A: Printer capacity and estimated workload.
        HP Laser 303dw: C_HP = 30 * 60 = 1800 pages/hour
        Canon MegaTank G670: C_Canon = 3.9 * 60 = 234 images/hour
        K = C * H
        Estimated page demand: P_i = D_i * m_i
        Planning pages per order: B&W=4, Colour=3, Photocopying=5
        Load ratio: \rho = (P / K) * 100%
        """
        if pages_per_order is None:
            pages_per_order = {"bw": 4, "colour": 3, "photocopying": 5, "binding": 0}

        is_hp_working = working_printers in ("all", "hp_only")
        is_canon_working = working_printers in ("all", "canon_only")

        c_hp_hourly = (hp_rated_ppm * 60.0) if is_hp_working else 0.0
        c_canon_hourly = (canon_rated_ipm * 60.0) if is_canon_working else 0.0

        total_hours = sum(operating_hours_per_day)

        k_hp_weekly = c_hp_hourly * total_hours
        k_canon_weekly = c_canon_hourly * total_hours

        bw_orders = service_totals.get("B&W Printing", 0)
        colour_orders = service_totals.get("Colour Printing", 0)
        photocopy_orders = service_totals.get("Photocopying", 0)

        p_bw_pages = bw_orders * pages_per_order.get("bw", 4)
        p_colour_pages = colour_orders * pages_per_order.get("colour", 3)
        p_photo_pages = photocopy_orders * pages_per_order.get("photocopying", 5)

        if is_hp_working:
            rho_hp = round((p_bw_pages / k_hp_weekly) * 100.0, 2) if k_hp_weekly > 0 else 0.0
            hp_status = "Optimal" if rho_hp < 75.0 else ("Warning" if rho_hp < 95.0 else "Critical")
        else:
            rho_hp = 100.0 if p_bw_pages > 0 else 0.0
            hp_status = "Out of Service - Printer Issue"

        if is_canon_working:
            rho_canon = round((p_colour_pages / k_canon_weekly) * 100.0, 2) if k_canon_weekly > 0 else 0.0
            canon_status = "Optimal" if rho_canon < 75.0 else ("Warning" if rho_canon < 95.0 else "Critical")
        else:
            rho_canon = 100.0 if p_colour_pages > 0 else 0.0
            canon_status = "Out of Service - Printer Issue"

        working_count = (1 if is_hp_working else 0) + (1 if is_canon_working else 0)
        if working_count == 2:
            status_summary = "All printers operational (HP Laser & Canon PIXMA)"
        elif is_hp_working:
            status_summary = "Using Printer 1 only: HP Laser 303dw (Canon out of service)"
        elif is_canon_working:
            status_summary = "Using Printer 2 only: Canon PIXMA G670 (HP out of service)"
        else:
            status_summary = "WARNING: Neither printer is working. Total printer capacity is 0."

        return {
            "hp_laser_303dw": {
                "model_name": "HP Laser 303dw",
                "rated_ppm": hp_rated_ppm if is_hp_working else 0.0,
                "hourly_capacity": int(c_hp_hourly),
                "weekly_capacity": int(k_hp_weekly),
                "allocated_service": "B&W Printing",
                "weekly_orders": bw_orders,
                "pages_per_order": pages_per_order.get("bw", 4),
                "estimated_pages": p_bw_pages,
                "load_ratio_percent": rho_hp,
                "status": hp_status,
                "is_operational": is_hp_working
            },
            "canon_pixma_g670": {
                "model_name": "Canon PIXMA MegaTank G670",
                "rated_ipm": canon_rated_ipm if is_canon_working else 0.0,
                "hourly_capacity": round(c_canon_hourly, 1),
                "weekly_capacity": int(k_canon_weekly),
                "allocated_service": "Colour Printing",
                "weekly_orders": colour_orders,
                "pages_per_order": pages_per_order.get("colour", 3),
                "estimated_pages": p_colour_pages,
                "load_ratio_percent": rho_canon,
                "status": canon_status,
                "is_operational": is_canon_working
            },
            "photocopying_standalone": {
                "service": "Photocopying",
                "weekly_orders": photocopy_orders,
                "pages_per_order": pages_per_order.get("photocopying", 5),
                "estimated_pages": p_photo_pages,
                "note": "Treated as standalone multifunction printer workload in accordance with academic project report."
            },
            "assumptions": {
                "operating_hours_per_day": operating_hours_per_day,
                "total_weekly_hours": total_hours,
                "pages_per_order": pages_per_order,
                "working_printers": working_printers,
                "status_summary": status_summary
            }
        }

    @staticmethod
    def compute_staff_workload(
        service_totals: dict[str, int],
        daily_matrices: list[np.ndarray],
        day_names: list[str],
        staff_counts: list[int] | None = None,
        operating_hours_per_day: list[float] | None = None,
        handling_times: dict[str, float] | None = None,
        productive_work_factor: float = 1.0
    ) -> dict[str, Any]:
        r"""
        Step 3B: Staff availability and estimated workload.
        Scheduled staff availability: A = s * H
        Handling times: B&W=2m, Colour=4m, Binding=8m, Photocopying=2m
        W = \sum D_i * t_i (in minutes)
        W_hours = W / 60
        Workload ratio: u = (W_hours / A_week) * 100%
        """
        if staff_counts is None:
            staff_counts = [1] * 7
        if operating_hours_per_day is None:
            operating_hours_per_day = [9.0] * 7
        if handling_times is None:
            handling_times = {
                "B&W Printing": 2.0,
                "Colour Printing": 4.0,
                "Binding": 8.0,
                "Photocopying": 2.0
            }

        scheduled_weekly_hours = sum(s * h for s, h in zip(staff_counts, operating_hours_per_day))
        actual_available_weekly_hours = sum(s * h * productive_work_factor for s, h in zip(staff_counts, operating_hours_per_day))

        # Total workload in minutes
        total_workload_mins = 0.0
        service_workload_breakdown = {}
        for s_name in SERVICE_NAMES:
            orders = service_totals.get(s_name, 0)
            t_i = handling_times.get(s_name, 2.0)
            mins = orders * t_i
            total_workload_mins += mins
            service_workload_breakdown[s_name] = {
                "weekly_orders": orders,
                "handling_time_min": t_i,
                "estimated_minutes": round(mins, 1),
                "estimated_hours": round(mins / 60.0, 2)
            }

        total_workload_hours = round(total_workload_mins / 60.0, 2)
        weekly_utilization = round((total_workload_hours / actual_available_weekly_hours) * 100.0, 2) if actual_available_weekly_hours > 0 else 0.0

        # Daily breakdown
        daily_breakdown = []
        for d_idx, D_d in enumerate(daily_matrices):
            d_name = day_names[d_idx] if d_idx < len(day_names) else f"Day {d_idx + 1}"
            day_orders_per_service = np.sum(D_d, axis=1)  # row sums for that day
            day_workload_mins = sum(
                day_orders_per_service[i] * handling_times.get(SERVICE_NAMES[i], 2.0)
                for i in range(4)
            )
            day_workload_hours = round(day_workload_mins / 60.0, 2)
            avail_hours = staff_counts[d_idx] * operating_hours_per_day[d_idx] * productive_work_factor
            day_util = round((day_workload_hours / avail_hours) * 100.0, 2) if avail_hours > 0 else 0.0
            extra_hours = max(0.0, round(day_workload_hours - avail_hours, 2)) if avail_hours > 0 else float(day_workload_hours)

            daily_breakdown.append({
                "day_number": d_idx + 1,
                "day_name": d_name,
                "staff_present": staff_counts[d_idx],
                "operating_hours": operating_hours_per_day[d_idx],
                "available_staff_hours": round(avail_hours, 2),
                "workload_minutes": round(float(day_workload_mins), 1),
                "workload_hours": float(day_workload_hours),
                "utilization_percent": float(day_util),
                "is_overloaded": True if (day_util > 100.0 or (staff_counts[d_idx] == 0 and day_workload_hours > 0)) else False,
                "is_underused": True if (day_util < 30.0 and avail_hours > 0) else False,
                "extra_staff_hours_needed": extra_hours
            })

        has_zero_staff = any(s == 0 for s in staff_counts)
        staff_message = "No staff present today. Utilization can't be calculated; capacity is treated as 0." if all(s == 0 for s in staff_counts) else None

        return {
            "scheduled_availability_weekly_hours": round(scheduled_weekly_hours, 2),
            "actual_available_weekly_hours": round(actual_available_weekly_hours, 2),
            "total_workload_minutes": round(total_workload_mins, 1),
            "total_workload_hours": total_workload_hours,
            "weekly_utilization_percent": weekly_utilization,
            "has_zero_staff": has_zero_staff,
            "staff_message": staff_message,
            "service_workload_breakdown": service_workload_breakdown,
            "daily_breakdown": daily_breakdown,
            "assumptions": {
                "staff_counts": staff_counts,
                "operating_hours_per_day": operating_hours_per_day,
                "handling_times_min": handling_times,
                "productive_work_factor": productive_work_factor
            }
        }

    @staticmethod
    def compute_slot_capacity_and_bottlenecks(
        W: np.ndarray,
        staff_present: int = 1,
        working_printers: str = "all",
        handling_times: dict[str, float] | None = None,
        slot_durations: list[float] = DEFAULT_SLOT_DURATIONS,
        productive_work_factor: float = 1.0,
        hp_rated_ppm: float = 30.0,
        canon_rated_ipm: float = 3.9
    ) -> list[dict[str, Any]]:
        """
        Step 4: Slot-by-slot capacity, workload, utilization, and bottleneck analysis.
        Compares staff vs printer limits per 2-hour/3-hour operating time slot.
        """
        if handling_times is None:
            handling_times = {
                "B&W Printing": 2.0,
                "Colour Printing": 4.0,
                "Binding": 8.0,
                "Photocopying": 2.0
            }

        is_hp = working_printers in ("all", "hp_only")
        is_canon = working_printers in ("all", "canon_only")
        hp_hourly_cap = (hp_rated_ppm * 60.0) if is_hp else 0.0
        canon_hourly_cap = (canon_rated_ipm * 60.0) if is_canon else 0.0

        slot_analysis = []
        for j, slot_label in enumerate(TIME_SLOT_LABELS):
            h_j = slot_durations[j]
            # Average daily jobs in this slot across 7 days
            slot_jobs_avg = [float(W[i, j]) / 7.0 for i in range(4)]
            # Slot workload in minutes (average daily in that slot)
            slot_workload_mins = sum(slot_jobs_avg[i] * handling_times.get(SERVICE_NAMES[i], 2.0) for i in range(4))
            slot_workload_hours = slot_workload_mins / 60.0

            # Staff capacity in this slot
            staff_cap_hours = staff_present * h_j * productive_work_factor
            staff_cap_mins = staff_cap_hours * 60.0

            if staff_cap_hours > 0:
                staff_util = round((slot_workload_hours / staff_cap_hours) * 100.0, 2)
            else:
                staff_util = 0.0

            is_overloaded = True if (staff_util > 100.0 or (staff_present == 0 and slot_workload_mins > 0)) else False
            is_underused = True if (staff_util < 30.0 and staff_cap_hours > 0) else False
            extra_staff_hours = max(0.0, round(slot_workload_hours - staff_cap_hours, 2))

            # Printer capacity in this slot
            hp_cap_pages = round(hp_hourly_cap * h_j, 1)
            canon_cap_pages = round(canon_hourly_cap * h_j, 1)

            bw_pages_avg = slot_jobs_avg[0] * 4.0      # B&W pages per order
            colour_pages_avg = slot_jobs_avg[1] * 3.0  # Colour pages per order

            hp_load = round((bw_pages_avg / hp_cap_pages) * 100.0, 2) if hp_cap_pages > 0 else (100.0 if bw_pages_avg > 0 else 0.0)
            canon_load = round((colour_pages_avg / canon_cap_pages) * 100.0, 2) if canon_cap_pages > 0 else (100.0 if colour_pages_avg > 0 else 0.0)

            # Determine bottleneck
            if staff_present == 0:
                bottleneck = "Staff (No staff present - capacity is 0)"
                bottleneck_type = "staff"
            elif not is_hp and not is_canon:
                bottleneck = "Printers (Neither printer is working)"
                bottleneck_type = "printer"
            elif not is_hp and bw_pages_avg > 0:
                bottleneck = "Printer 1: HP Laser broken (B&W unfulfillable)"
                bottleneck_type = "printer"
            elif not is_canon and colour_pages_avg > 0:
                bottleneck = "Printer 2: Canon broken (Colour unfulfillable)"
                bottleneck_type = "printer"
            else:
                max_printer_load = max(hp_load, canon_load)
                if staff_util >= max_printer_load:
                    bottleneck = f"Staff ({staff_util:.1f}% utilized)"
                    bottleneck_type = "staff"
                else:
                    which_p = "HP Laser" if hp_load >= canon_load else "Canon G670"
                    bottleneck = f"Printer: {which_p} ({max_printer_load:.1f}% load)"
                    bottleneck_type = "printer"

            slot_analysis.append({
                "slot_label": slot_label,
                "duration_hours": h_j,
                "staff_present": staff_present,
                "staff_capacity_hours": round(staff_cap_hours, 2),
                "staff_capacity_minutes": round(staff_cap_mins, 1),
                "workload_minutes": round(slot_workload_mins, 1),
                "workload_hours": round(slot_workload_hours, 2),
                "staff_utilization_percent": staff_util,
                "is_overloaded": is_overloaded,
                "is_underused": is_underused,
                "extra_staff_hours_needed": extra_staff_hours,
                "hp_capacity_pages": hp_cap_pages,
                "hp_demand_pages": round(bw_pages_avg, 1),
                "hp_load_percent": hp_load,
                "canon_capacity_pages": canon_cap_pages,
                "canon_demand_pages": round(colour_pages_avg, 1),
                "canon_load_percent": canon_load,
                "bottleneck": bottleneck,
                "bottleneck_type": bottleneck_type
            })

        return slot_analysis
