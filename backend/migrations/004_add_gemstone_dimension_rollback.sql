-- ============================================================================
--  Rollback for Migration 004 — remove the dimension column
-- ============================================================================
--  Drops gemstones.dimension. Any values entered into it are lost, but no other
--  data is affected — the dimension-wise report simply goes back to parsing the
--  code field only. Guarded so it is safe to run even if the column is gone.
-- ============================================================================

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'gemstones'
    AND COLUMN_NAME  = 'dimension'
);
SET @sql := IF(@has_col = 1,
  'ALTER TABLE gemstones DROP COLUMN dimension',
  'SELECT ''gemstones.dimension does not exist — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
