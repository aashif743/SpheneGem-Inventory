-- ============================================================================
--  Rollback for migration 001
-- ============================================================================
--  Drops ONLY the new stock_additions table. No existing table is touched.
--
--  WARNING: this permanently discards the stock-addition history. The
--  gemstones table itself is unaffected — stock levels stay exactly as they
--  are. Only the audit trail is lost.
-- ============================================================================

DROP TABLE IF EXISTS stock_additions;
