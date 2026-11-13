from pathlib import Path

import httpx

if __name__ == "__main__":
    csv_path = Path(__file__).resolve().parent.parent / "data" / "sample_academic_dataset.csv"
    with open(csv_path, "rb") as f:
        files = {"file": ("sample.csv", f, "text/csv")}
        r = httpx.post("http://localhost:8000/api/analyze-csv", files=files, data={"save_to_supabase": "false"})
        print("Status code:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            print("Success!")
            print("Total weekly demand:", data["calculations"]["total_weekly_demand"])
            print("Top service:", data["calculations"]["top_service"])
            print("Peak time slot:", data["calculations"]["peak_time_slot"])
            print("Printer HP load %:", data["calculations"]["printer_metrics"]["hp_laser_303dw"]["load_ratio_percent"])
            print("Canon load %:", data["calculations"]["printer_metrics"]["canon_pixma_g670"]["load_ratio_percent"])
            print("Staff utilization %:", data["calculations"]["staff_metrics"]["weekly_utilization_percent"])
            print("Matrix rank:", data["calculations"]["advanced_analysis"]["matrix_rank"])
            print("Eigenvalues:", data["calculations"]["advanced_analysis"]["eigenvalues"])
            print("Recommendations count:", len(data["calculations"]["recommendations"]))
        else:
            print("Error content:", r.text)
