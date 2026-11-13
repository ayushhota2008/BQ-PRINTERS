import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

# Search for .env in backend directory, current working directory, or parent
for candidate in [
    Path(__file__).resolve().parent.parent / ".env",
    Path(".env"),
    Path("backend/.env"),
]:
    if candidate.exists():
        load_dotenv(dotenv_path=candidate)
        break

class Settings(BaseModel):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    API_PORT: int = int(os.getenv("PORT", "8000"))
    API_HOST: str = os.getenv("HOST", "0.0.0.0")

    # Centralized Shop & Equipment Defaults
    DEFAULT_STAFF_COUNT: int = 1
    MAX_STAFF_COUNT: int = 20
    DEFAULT_OPERATING_HOURS: float = 9.0
    PRODUCTIVE_WORK_FACTOR: float = 1.0
    LOW_UTILIZATION_THRESHOLD: float = 30.0
    OVERLOAD_UTILIZATION_THRESHOLD: float = 100.0

    # Equipment Specifications
    HP_RATED_PPM: float = 30.0       # HP Laser 303dw: 30 pages/minute (1,800 pages/hour)
    CANON_RATED_IPM: float = 3.9     # Canon PIXMA G670: 3.9 images/minute (234 pages/hour)

    # Order Planning Factors
    PAGES_PER_ORDER: dict = {
        "bw": 4,
        "colour": 3,
        "photocopying": 5,
        "binding": 0
    }

    # Handling Time in Minutes per Order
    HANDLING_TIMES_MIN: dict = {
        "B&W Printing": 2.0,
        "Colour Printing": 4.0,
        "Binding": 8.0,
        "Photocopying": 2.0
    }

settings = Settings()

