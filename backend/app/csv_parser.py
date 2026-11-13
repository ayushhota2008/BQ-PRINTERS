import re
from typing import Any

import numpy as np

REQUIRED_SERVICES = [
    "B&W Printing",
    "Colour Printing",
    "Binding",
    "Photocopying"
]

DEFAULT_WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

def normalize_service_name(name: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z]', '', str(name)).lower()
    if "bw" in cleaned or "black" in cleaned or "b&w" in str(name).lower():
        return "B&W Printing"
    elif "col" in cleaned:
        return "Colour Printing"
    elif "bind" in cleaned:
        return "Binding"
    elif "photo" in cleaned or "copy" in cleaned or "xerox" in cleaned:
        return "Photocopying"
    return str(name).strip()

def normalize_column_name(col: str) -> str:
    cleaned = re.sub(r'\s+', ' ', str(col).strip())
    c_lower = cleaned.lower()
    if "day" in c_lower:
        return "Day"
    elif "serv" in c_lower:
        return "Service"
    elif "9" in c_lower and "11" in c_lower:
        return "9 AM–11 AM"
    elif "11" in c_lower and "1" in c_lower:
        return "11 AM–1 PM"
    elif "1" in c_lower and "4" in c_lower:
        return "1 PM–4 PM"
    elif "4" in c_lower and "6" in c_lower:
        return "4 PM–6 PM"
    return cleaned

from app.file_parser import UploadValidationError, parse_uploaded_file


class CSVParser:
    @staticmethod
    def parse_and_validate(csv_content: str) -> tuple[list[np.ndarray], list[str], np.ndarray, list[dict[str, Any]]]:
        """
        Parses CSV data by delegating to the unified parse_uploaded_file pipeline.
        Maintains backwards compatibility for callers and existing unit tests.
        """
        if not csv_content or not csv_content.strip():
            raise ValueError("The uploaded CSV file is empty.")

        try:
            res = parse_uploaded_file("dataset.csv", csv_content.encode("utf-8"))
            return res["daily_matrices"], res["day_names"], res["observations"], res["structured_rows"]
        except UploadValidationError as e:
            raise ValueError(e.message)

