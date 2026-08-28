-- ============================================================================
--  Rollback for migration 002
-- ============================================================================
--  WARNING — READ BEFORE RUNNING
--    Dropping `invoices` and `sales.invoice_id` destroys the grouping that
--    ties a multi-gemstone sale together. The individual `sales` rows SURVIVE
--    (no money or stock record is lost), but they become unlinked single
--    sales and their combined PDF can no longer be regenerated.
--
--    Only run this if you are also rolling the backend code back to the
--    version before multi-sell.
-- ============================================================================

SET @has_idx := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'sales'
    AND INDEX_NAME   = 'idx_sales_invoice_id'
);
SET @sql := IF(@has_idx > 0,
  'DROP INDEX idx_sales_invoice_id ON sales',
  'SELECT ''idx_sales_invoice_id not present — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'sales'
    AND COLUMN_NAME  = 'invoice_id'
);
SET @sql := IF(@has_col > 0,
  'ALTER TABLE sales DROP COLUMN invoice_id',
  'SELECT ''sales.invoice_id not present — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS invoices;
