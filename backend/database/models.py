from sqlalchemy import Column, String, Numeric, Date, Integer, ForeignKey, Index
from database.connection import Base


class Branch(Base):
    __tablename__ = "branches"

    branch_id = Column(String(50), primary_key=True)
    region = Column(String(100), nullable=False)
    country_code = Column(String(3), nullable=False)
    currency = Column(String(3), nullable=False)
    min_reserve_threshold = Column(Numeric(15, 2), nullable=False)
    current_balance = Column(Numeric(15, 2), default=0.00)


class DailyLiquidityLog(Base):
    __tablename__ = "daily_liquidity_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    branch_id = Column(String(50), ForeignKey("branches.branch_id"), nullable=False)
    record_date = Column(Date, nullable=False)
    opening_balance = Column(Numeric(15, 2))
    closing_balance = Column(Numeric(15, 2))
    total_withdrawals = Column(Numeric(15, 2))
    total_deposits = Column(Numeric(15, 2))

    __table_args__ = (
        Index("idx_branch_date_lookup", "branch_id", "record_date"),
    )
