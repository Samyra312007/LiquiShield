import math
import random
from datetime import datetime, timedelta
from database.connection import get_session_local, get_engine, Base, init_db
from database.models import Branch, DailyLiquidityLog

init_db()
SessionLocal = get_session_local()

BRANCHES = [
    {"branch_id": "BR-NYC-001", "region": "North America", "country_code": "USA", "currency": "USD", "min_reserve": 5_000_000.00, "base_balance": 120_000_000.00},
    {"branch_id": "BR-NYC-002", "region": "North America", "country_code": "USA", "currency": "USD", "min_reserve": 3_500_000.00, "base_balance": 85_000_000.00},
    {"branch_id": "BR-CHI-001", "region": "North America", "country_code": "USA", "currency": "USD", "min_reserve": 2_000_000.00, "base_balance": 45_000_000.00},
    {"branch_id": "BR-SFO-001", "region": "North America", "country_code": "USA", "currency": "USD", "min_reserve": 4_000_000.00, "base_balance": 95_000_000.00},
    {"branch_id": "BR-LON-001", "region": "EMEA", "country_code": "GBR", "currency": "GBP", "min_reserve": 3_000_000.00, "base_balance": 70_000_000.00},
    {"branch_id": "BR-LON-002", "region": "EMEA", "country_code": "GBR", "currency": "GBP", "min_reserve": 2_500_000.00, "base_balance": 55_000_000.00},
    {"branch_id": "BR-FRA-001", "region": "EMEA", "country_code": "DEU", "currency": "EUR", "min_reserve": 2_800_000.00, "base_balance": 60_000_000.00},
    {"branch_id": "BR-PAR-001", "region": "EMEA", "country_code": "FRA", "currency": "EUR", "min_reserve": 2_200_000.00, "base_balance": 50_000_000.00},
    {"branch_id": "BR-TOK-001", "region": "APAC", "country_code": "JPN", "currency": "JPY", "min_reserve": 4_500_000.00, "base_balance": 110_000_000.00},
    {"branch_id": "BR-TOK-002", "region": "APAC", "country_code": "JPN", "currency": "JPY", "min_reserve": 3_200_000.00, "base_balance": 78_000_000.00},
    {"branch_id": "BR-SNG-001", "region": "APAC", "country_code": "SGP", "currency": "SGD", "min_reserve": 1_800_000.00, "base_balance": 40_000_000.00},
    {"branch_id": "BR-HKG-001", "region": "APAC", "country_code": "HKG", "currency": "HKD", "min_reserve": 2_600_000.00, "base_balance": 65_000_000.00},
    {"branch_id": "BR-SYD-001", "region": "APAC", "country_code": "AUS", "currency": "AUD", "min_reserve": 2_000_000.00, "base_balance": 48_000_000.00},
    {"branch_id": "BR-DXB-001", "region": "LATAM & ME", "country_code": "ARE", "currency": "AED", "min_reserve": 1_500_000.00, "base_balance": 35_000_000.00},
    {"branch_id": "BR-SAO-001", "region": "LATAM & ME", "country_code": "BRA", "currency": "BRL", "min_reserve": 2_300_000.00, "base_balance": 52_000_000.00},
]

DAYS_OF_HISTORY = 730
END_DATE = datetime.now().date()


def seed():
    db = SessionLocal()

    existing = db.query(Branch).count()
    if existing > 0:
        print(f"Database already has {existing} branches. Skipping seed.")
        db.close()
        return

    for b in BRANCHES:
        branch = Branch(
            branch_id=b["branch_id"],
            region=b["region"],
            country_code=b["country_code"],
            currency=b["currency"],
            min_reserve_threshold=b["min_reserve"],
            current_balance=b["base_balance"],
        )
        db.add(branch)

        balance = b["base_balance"]
        for day_offset in range(DAYS_OF_HISTORY):
            record_date = END_DATE - timedelta(days=DAYS_OF_HISTORY - day_offset)

            withdrawal = random.uniform(100_000, 800_000) * (1 + 0.3 * math.sin(day_offset / 7))
            deposit = random.uniform(80_000, 750_000) * (1 + 0.2 * math.sin(day_offset / 30))
            net = deposit - withdrawal
            opening = balance
            balance = max(0, balance + net)
            closing = balance

            log = DailyLiquidityLog(
                branch_id=b["branch_id"],
                record_date=record_date,
                opening_balance=round(opening, 2),
                closing_balance=round(closing, 2),
                total_withdrawals=round(withdrawal, 2),
                total_deposits=round(deposit, 2),
            )
            db.add(log)

        db.flush()

    db.commit()
    db.close()
    print(f"Seeded {len(BRANCHES)} branches with {DAYS_OF_HISTORY} days of liquidity logs.")


if __name__ == "__main__":
    seed()
