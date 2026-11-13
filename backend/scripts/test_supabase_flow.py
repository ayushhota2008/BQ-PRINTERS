from pathlib import Path

import httpx

if __name__ == "__main__":
    csv_path = Path(__file__).resolve().parent.parent / "data" / "sample_academic_dataset.csv"
    with open(csv_path, "rb") as f:
        files = {"file": ("sample.csv", f, "text/csv")}
        r = httpx.post(
            "http://localhost:8000/api/analyze-csv",
            files=files,
            data={"dataset_name": "Academic Benchmark Week 1", "week_label": "Week 1 (Report)", "save_to_supabase": "true"}
        )
        print("Status code:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            print("Dataset ID created in Supabase:", data["dataset_id"])

            # Test listing datasets
            r_list = httpx.get("http://localhost:8000/api/datasets")
            print("Total datasets in Supabase:", len(r_list.json()))

            # Test getting details
            r_det = httpx.get(f"http://localhost:8000/api/datasets/{data['dataset_id']}")
            print("Retrieved details status:", r_det.status_code)
        else:
            print("Error:", r.text)
