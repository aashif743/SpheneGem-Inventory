-- ============================================================================
--  Migration 002 — Multi-gemstone invoices
-- ============================================================================
--  PURPOSE
--    Allow several gemstones to be sold in one transaction and appear on a
--    single invoice.
--
--  DESIGN — WHY sales IS NOT RESTRUCTURED
--    `sales` keeps ONE ROW PER GEMSTONE SOLD, exactly as today. A new parent
--    table `invoices` groups rows that were sold together, linked by a new
--    nullable `sales.invoice_id`.
--
--    This matters because every existing query keeps working untouched:
--      * SalesTable          SELECT * FROM sales ORDER BY sold_at DESC
--      * Sales statement PDF SELECT * FROM sales WHERE sold_at BETWEEN ...
--      * Dashboard revenue   SUM(total_amount) FROM sales
--      * Dashboard join      sales s JOIN gemstones g ON s.gemstone_id = g.id
--    None of them need to change, and no historical row is rewritten.
--
--  SAFETY
--    Additive only:
--      1. CREATE TABLE invoices              (new table)
--      2. ALTER TABLE sales ADD invoice_id   (new NULLABLE column, no default
--                                             needed — existing rows get NULL)
--      3. CREATE INDEX on that new column
--    Nothing is dropped, renamed, re-typed or back-filled. Existing sales rows
--    keep invoice_id = NULL and continue to use their original
--    `invoice_<saleId>.pdf` file, so every old invoice still downloads.
--
--    Steps 2 and 3 are guarded so this file is safe to run more than once.
--
--  NOTE ON LOCKING
--    Verified against the production server: MariaDB 11.8.8, where ADD COLUMN
--    is an instant/online operation. The sales table is small (~726 rows), so
--    this completes immediately. Still, run it while the client is not selling.
--
--  HOW TO APPLY
--    mysqldump -u USER -p DBNAME > backup_before_002.sql
--    mysql -u USER -p DBNAME < backend/migrations/002_create_invoices.sql
--
--  ROLLBACK
--    See 002_create_invoices_rollback.sql
-- ============================================================================

-- ── 1. Invoice header ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             INT AUTO_INCREMENT PRIMARY KEY,

  -- Human-facing number, e.g. "INV-000042". Unique so a duplicate can never
  -- be issued even if two sales are submitted at the same moment.
  invoice_number VARCHAR(32)    NOT NULL,

  item_count     INT            NOT NULL DEFAULT 0,
  total_quantity INT            NOT NULL DEFAULT 0,
  total_carat    DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  total_amount   DECIMAL(14,2)  NOT NULL DEFAULT 0.00,

  -- Filename of the generated PDF. NULL if PDF generation failed — the sale
  -- itself is still valid and the PDF can be regenerated later.
  pdf_filename   VARCHAR(255)   NULL,

  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_invoices_number (invoice_number),
  INDEX idx_invoices_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. Link sales rows to an invoice (guarded, re-runnable) ─────────────────
SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'sales'
    AND COLUMN_NAME  = 'invoice_id'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE sales ADD COLUMN invoice_id INT NULL',
  'SELECT ''sales.invoice_id already exists — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ── 3. Index for grouping a sale's rows by invoice (guarded, re-runnable) ───
SET @has_idx := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'sales'
    AND INDEX_NAME   = 'idx_sales_invoice_id'
);
SET @sql := IF(@has_idx = 0,
  'CREATE INDEX idx_sales_invoice_id ON sales (invoice_id)',
  'SELECT ''idx_sales_invoice_id already exists — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
