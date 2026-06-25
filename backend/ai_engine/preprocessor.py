import pandas as pd
from typing import List


def prepare_prophet_df(dates: List[str], cash: List[float]) -> pd.DataFrame:
    """Convert API date/cash arrays into a clean Prophet-ready DataFrame."""
    df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": cash})
    df = df.dropna().sort_values("ds").reset_index(drop=True)
    return df
