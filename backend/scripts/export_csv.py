import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.sample_data import get_sample_csv_text

out_path = BASE_DIR / "data" / "sample_academic_dataset.csv"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(get_sample_csv_text())

print(f"Exported {out_path} successfully.")
