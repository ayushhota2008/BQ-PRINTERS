from typing import Any

from app.models import BusinessRecommendation


class InsightsEngine:
    """
    Translates raw mathematical calculations into actionable, professional
    business advice for the printing shopkeeper.
    """

    @staticmethod
    def generate_recommendations(
        service_percentages: dict[str, float],
        peak_time_slot: str,
        peak_rate: float,
        duration_adjusted_rates: dict[str, float],
        busiest_day: dict[str, Any],
        least_busy_day: dict[str, Any],
        printer_metrics: dict[str, Any],
        staff_metrics: dict[str, Any],
        variance_explained: list[float]
    ) -> list[BusinessRecommendation]:
        recommendations = []
        rec_id = 1

        # 1. B&W Stock & Materials
        bw_pct = service_percentages.get("B&W Printing", 0.0)
        if bw_pct >= 40.0:
            recommendations.append(BusinessRecommendation(
                id=rec_id,
                title="Stock More B&W Paper & Ink",
                description=f"B&W Printing accounts for {bw_pct:.2f}% of total demand. Ensure adequate stock of standard 75/80 GSM A4 paper and high-yield black toner, especially before peak hours ({peak_time_slot}).",
                category="Inventory",
                priority="High"
            ))
            rec_id += 1

        # 2. Peak Time Slot Staffing
        recommendations.append(BusinessRecommendation(
            id=rec_id,
            title="Plan Staff for Midday Rush",
            description=f"The busiest time slot is {peak_time_slot} with an intensity of {peak_rate:.1f} orders/hour. Schedule all 3 staff members on duty and pre-warm printers to eliminate customer queue bottlenecks.",
            category="Staffing",
            priority="High"
        ))
        rec_id += 1

        # 3. Colour Printing Growth & Printer Health
        colour_pct = service_percentages.get("Colour Printing", 0.0)
        canon_load = printer_metrics.get("canon_pixma_g670", {}).get("load_ratio_percent", 0.0)
        recommendations.append(BusinessRecommendation(
            id=rec_id,
            title="Prepare for Colour Printing Growth",
            description=f"Colour Printing contributes {colour_pct:.2f}% of demand (Canon load ratio at {canon_load:.2f}%). Keep premium 100 GSM sheets and colour tank refills handy for presentation and project prints.",
            category="Operations",
            priority="Medium"
        ))
        rec_id += 1

        # 4. Off-peak Optimization & Preventative Maintenance
        least_slot = min(duration_adjusted_rates.items(), key=lambda x: x[1], default=("4 PM–6 PM", 0.0))
        least_day_name = least_busy_day.get("day_name", "Sunday") if isinstance(least_busy_day, dict) else "Sunday"
        least_day_demand = least_busy_day.get("total_demand", 0) if isinstance(least_busy_day, dict) else 0
        recommendations.append(BusinessRecommendation(
            id=rec_id,
            title="Optimize Resources & Maintenance",
            description=f"The quietest period is {least_slot[0]} ({least_slot[1]:.1f} orders/hr) and {least_day_name} ({least_day_demand} orders). Use these low-traffic windows for printer roller cleaning, binding machine prep, and restocking.",
            category="Efficiency",
            priority="Low"
        ))
        rec_id += 1

        # 5. Overload Warning if applicable
        weekly_util = staff_metrics.get("weekly_utilization_percent", 0.0)
        if weekly_util > 75.0:
            recommendations.append(BusinessRecommendation(
                id=rec_id,
                title="Staff Utilization Alert",
                description=f"Staff utilization has reached {weekly_util:.1f}%. High customer turnaround time may cause order backlogs. Consider temporary shift assistance on {busiest_day['day_name']}.",
                category="Staffing",
                priority="Critical"
            ))
            rec_id += 1

        # 6. Primary demand component insight from Eigenvalue Decomposition
        if len(variance_explained) > 0 and variance_explained[0] > 80.0:
            recommendations.append(BusinessRecommendation(
                id=rec_id,
                title="Unified Customer Volume Pattern",
                description=f"Statistical eigenvalue analysis reveals {variance_explained[0]:.1f}% of demand variance stems from general footfall rather than service-specific spikes. Marketing initiatives or university exams boost all services simultaneously.",
                category="Strategy",
                priority="Medium"
            ))
            rec_id += 1

        return recommendations
