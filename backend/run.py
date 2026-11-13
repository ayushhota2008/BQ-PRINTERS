import os
import sys
from pathlib import Path

import uvicorn

# Ensure the backend directory is in sys.path regardless of where the command is executed
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=os.getenv("RELOAD", "true").lower() == "true",
        app_dir=str(BASE_DIR),
    )
