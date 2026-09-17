-- ============================================================================
--  Migration 004 — Optional gemstone dimension
-- ============================================================================
--  PURPOSE
--    Give each gemstone its own dimension field (e.g. "10x7mm"). Until now the
--    client has been typing sizes into the `code` field, so the dimension-wise
--    report has to parse them back out and some are missed. A dedicated column
--    makes entry clean and the report reliable.
--
--  DESIGN
--    One new NULLABLE column, `gemstones.dimension VARCHAR(50)`. It is optional:
--    a stone with no dimension keeps NULL. The report still falls back to
--    parsing the `code` field for the ~108 older stones that already carry a
--    dimension there, so nothing has to be re-entered.
--
--  SAFETY
--    Additive only — one ADD COLUMN. Nothing is dropped, renamed, re-typed or
--    back-filled. Every existing row simply gets dimension = NULL. No existing
--    query is affected (they all name their columns explicitly). image_url and
--    all other data are untouched.
--
--    The ALTER is guarded so this file is safe to run more than once.
--
--  NOTE ON LOCKING
--    MariaDB 11.8.8 performs ADD COLUMN as an instant operation; gemstones is
--    ~627 rows, so this completes immediately.
--
--  HOW TO APPLY
--    (backup first)
--    mysql -u USER -p DBNAME < backend/migrations/004_add_gemstone_dimension.sql
--
--  ROLLBACK
--    See 004_add_gemstone_dimension_rollback.sql
-- ============================================================================

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'gemstones'
    AND COLUMN_NAME  = 'dimension'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE gemstones ADD COLUMN dimension VARCHAR(50) NULL AFTER shape',
  'SELECT ''gemstones.dimension already exists — skipped'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
