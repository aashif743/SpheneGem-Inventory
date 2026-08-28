-- ============================================================================
--  Migration 003 — Store prices and weights as DECIMAL(12,2), not FLOAT
-- ============================================================================
--  ⚠️  THIS IS THE ONLY MIGRATION THAT CHANGES EXISTING COLUMNS.
--      Take a fresh mysqldump immediately before running it.
--
--  THE PROBLEM
--    gemstones.weight / price_per_carat / total_price  and
--    sales.carat_sold / marking_price / selling_price / total_amount
--    are all declared FLOAT — 4-byte single precision, roughly 7 significant
--    decimal digits. FLOAT cannot represent a 2-decimal money value exactly.
--
--    Verified against the production backup (2026-08-28):
--        34,588.10  is actually stored as  34588.101562
--
--    Screens hide this because every display path calls .toFixed(2). The
--    error surfaces in aggregates that add the raw column values:
--        SELECT SUM(total_amount) FROM sales      -- dashboard revenue
--        the Grand Total on the sales statement PDF
--        the Stock Value on the stock summary PDF
--    Each of ~726 sales rows contributes its own small error to those totals.
--
--  THE FIX
--    DECIMAL(12,2) stores the exact 2-decimal value the client typed.
--    Range: up to 9,999,999,999.99 — the largest value currently stored is
--    50,249.50, so there is enormous headroom.
--
--  IS ANY DATA LOST?
--    No. Converting FLOAT -> DECIMAL(12,2) ROUNDS each value to 2 decimals,
--    which is exactly the number already shown on screen and on every PDF.
--    34588.101562 becomes 34588.10 — it corrects the stored value rather than
--    losing anything. Run STEP 1 below to see the affected rows first.
--
--  LOCKING
--    A type change rebuilds the table. gemstones (~1,200 rows) and sales
--    (~726 rows) are tiny, so this completes in well under a second. Still,
--    run it while the client is not using the system.
--
--  HOW TO APPLY
--    mysqldump -u USER -p DBNAME > backup_before_003.sql
--    mysql -u USER -p DBNAME < backend/migrations/003_money_columns_to_decimal.sql
--
--  ROLLBACK
--    See 003_money_columns_to_decimal_rollback.sql — but the mysqldump above
--    is the real safety net, because reverting to FLOAT reintroduces the
--    imprecision rather than restoring the old inexact values.
-- ============================================================================


-- ── STEP 1: DRY RUN — inspect before changing anything ──────────────────────
-- Run this on its own first. It only SELECTs. Any row listed will have its
-- stored value rounded to the 2 decimals already displayed in the app.

SELECT 'gemstones' AS table_name, id, code,
       weight          AS stored_value,
       ROUND(weight, 2) AS after_migration
FROM gemstones
WHERE weight <> ROUND(weight, 2)
UNION ALL
SELECT 'gemstones', id, code, total_price, ROUND(total_price, 2)
FROM gemstones
WHERE total_price <> ROUND(total_price, 2)
UNION ALL
SELECT 'sales', id, code, total_amount, ROUND(total_amount, 2)
FROM sales
WHERE total_amount <> ROUND(total_amount, 2)
LIMIT 200;

-- Totals before, so you can compare them after the migration:
SELECT ROUND(SUM(total_amount), 2) AS revenue_before,
       ROUND(SUM(carat_sold),   2) AS carat_sold_before
FROM sales;
SELECT ROUND(SUM(total_price), 2)  AS stock_value_before,
       ROUND(SUM(weight),      2)  AS stock_carat_before
FROM gemstones;


-- ── STEP 2: THE CONVERSION ──────────────────────────────────────────────────
-- Each column keeps its exact nullability and default; only the type changes.

ALTER TABLE gemstones
  MODIFY `weight`          DECIMAL(12,2) NOT NULL,
  MODIFY `price_per_carat` DECIMAL(12,2) NOT NULL,
  MODIFY `total_price`     DECIMAL(12,2) NOT NULL;

ALTER TABLE sales
  MODIFY `carat_sold`    DECIMAL(12,2) DEFAULT NULL,
  MODIFY `marking_price` DECIMAL(12,2) DEFAULT NULL,
  MODIFY `selling_price` DECIMAL(12,2) DEFAULT NULL,
  MODIFY `total_amount`  DECIMAL(12,2) DEFAULT NULL;


-- ── STEP 3: VERIFY ──────────────────────────────────────────────────────────
-- Compare these against the "before" figures from STEP 1. They should match
-- to the cent (tiny differences are the FLOAT error being corrected).

SELECT ROUND(SUM(total_amount), 2) AS revenue_after,
       ROUND(SUM(carat_sold),   2) AS carat_sold_after
FROM sales;
SELECT ROUND(SUM(total_price), 2)  AS stock_value_after,
       ROUND(SUM(weight),      2)  AS stock_carat_after
FROM gemstones;

-- Confirm the new types are in place:
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'gemstones' AND COLUMN_NAME IN ('weight','price_per_carat','total_price'))
    OR (TABLE_NAME = 'sales'     AND COLUMN_NAME IN ('carat_sold','marking_price','selling_price','total_amount')))
ORDER BY TABLE_NAME, COLUMN_NAME;
