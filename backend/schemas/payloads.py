from pydantic import BaseModel, Field
from typing import List, Optional


class SimulationRequest(BaseModel):
    severity_multiplier: float = Field(..., ge=1.0, le=5.0, description="Crisis severity multiplier (1.0 to 5.0)")
    forecast_days: int = Field(default=30, ge=1, le=90, description="Number of days to forecast")
    regions: List[str] = Field(default=["ALL"], description="Target regions or ['ALL'] for all branches")


class HistoryPayload(BaseModel):
    branch_id: str
    historical_dates: List[str]
    historical_cash: List[float]
    retail_runoff_rate: float
    corporate_runoff_rate: float


class ForecastResult(BaseModel):
    branch_id: str
    region: str
    predicted_dates: List[str]
    forecasted_cash: List[float]
    will_breach_minimum: bool
    breach_date: Optional[str] = None
    days_until_zero: Optional[int] = None


class BranchStatus(BaseModel):
    branch_id: str
    region: str
    country_code: str
    currency: str
    current_balance: float
    min_reserve_threshold: float
    is_flagged: bool = False


class BaselineResponse(BaseModel):
    branches: List[BranchStatus]
    total_liquidity: float
    total_branches: int
    branches_at_risk: int


class SimulateResponse(BaseModel):
    forecasts: List[ForecastResult]
    execution_time_ms: float
