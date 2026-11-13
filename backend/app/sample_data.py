import json
import os

import pandas as pd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(CURRENT_DIR, "exact_dataset.json")

with open(JSON_PATH) as f:
    SAMPLE_DATA_ROWS = json.load(f)

def get_sample_df() -> pd.DataFrame:
    return pd.DataFrame(SAMPLE_DATA_ROWS)

def get_sample_csv_text() -> str:
    df = get_sample_df()
    return df.to_csv(index=False)
