"""
Authentication module stub.
Authentication is disabled — BQ PRINTERS runs as an open local analytics dashboard.
"""
from typing import Any


def get_current_user_optional(*args, **kwargs) -> dict[str, Any] | None:
    return None

def get_current_user(*args, **kwargs) -> dict[str, Any]:
    return {"id": None, "role": "admin"}
