"""initial_schema

Revision ID: 86e17829ec24
Revises:
Create Date: 2026-06-25 13:34:48.269785

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "86e17829ec24"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("branch_id", sa.String(50), primary_key=True),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("country_code", sa.String(3), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("min_reserve_threshold", sa.Numeric(15, 2), nullable=False),
        sa.Column("current_balance", sa.Numeric(15, 2), server_default="0.00"),
    )

    op.create_table(
        "daily_liquidity_logs",
        sa.Column("log_id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("branch_id", sa.String(50), sa.ForeignKey("branches.branch_id"), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("opening_balance", sa.Numeric(15, 2)),
        sa.Column("closing_balance", sa.Numeric(15, 2)),
        sa.Column("total_withdrawals", sa.Numeric(15, 2)),
        sa.Column("total_deposits", sa.Numeric(15, 2)),
    )

    op.create_index(
        "idx_branch_date_lookup",
        "daily_liquidity_logs",
        ["branch_id", "record_date"],
    )


def downgrade() -> None:
    op.drop_index("idx_branch_date_lookup", table_name="daily_liquidity_logs")
    op.drop_table("daily_liquidity_logs")
    op.drop_table("branches")
