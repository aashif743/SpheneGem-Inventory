-- ============================================================================
--  Rollback for migration 003
-- ============================================================================
--  ⚠️  PREFER RESTORING backup_before_003.sql INSTEAD OF RUNNING THIS.
--
--  Going back to FLOAT does not restore the previous inexact values — it just
--  reintroduces the imprecision, since FLOAT cannot hold an exact 2-decimal
--  number. Every amount would once again drift (34588.10 -> 34588.101562).
--
--  Only use this if you must match an older backend build that somehow
--  depended on the FLOAT type, and you accept that behaviour.
-- ============================================================================

ALTER TABLE gemstones
  MODIFY `weight`          FLOAT NOT NULL,
  MODIFY `price_per_carat` FLOAT NOT NULL,
  MODIFY `total_price`     FLOAT NOT NULL;

ALTER TABLE sales
  MODIFY `carat_sold`    FLOAT DEFAULT NULL,
  MODIFY `marking_price` FLOAT DEFAULT NULL,
  MODIFY `selling_price` FLOAT DEFAULT NULL,
  MODIFY `total_amount`  FLOAT DEFAULT NULL;
