-- ============================================================================
--  Migration 001 — Stock additions history
-- ============================================================================
--  PURPOSE
--    Records every "Add More Stock" action performed on an existing gemstone,
--    including the before/after values, so a mistyped entry can be traced and
--    reversed.
--
--  SAFETY
--    This migration is ADDITIVE ONLY. It creates one new table.
--    It does NOT alter, drop, rename or re-type any existing table or column.
--    No existing row is read, written or deleted. Running it cannot lose data.
--
--  NOTE ON THE MISSING FOREIGN KEY (deliberate)
--    `gemstones` rows are HARD DELETED when a stone sells out
--    (see gemstoneController.js — DELETE FROM gemstones WHERE id = ?).
--    Therefore we intentionally do NOT add a FOREIGN KEY on gemstone_id:
--      * ON DELETE CASCADE  would erase the purchase history of sold-out stones
--      * ON DELETE RESTRICT would break the sell flow entirely
--    gemstone_id is kept as a plain indexed column, and code/name are
--    denormalised so the history stays readable after the stone is gone.
--
--  HOW TO APPLY
--    mysqldump -u USER -p DBNAME > backup_before_001.sql     # take a backup
--    mysql -u USER -p DBNAME < backend/migrations/001_create_stock_additions.sql
--
--  ROLLBACK
--    See 001_create_stock_additions_rollback.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_additions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,

  -- Which stone was topped up (no FK — see note above)
  gemstone_id        INT            NOT NULL,
  code               VARCHAR(255)   NULL,
  name               VARCHAR(255)   NULL,

  -- What was added in this action
  quantity_added     INT            NOT NULL,
  carat_added        DECIMAL(12,2)  NOT NULL,
  price_per_carat    DECIMAL(12,2)  NOT NULL,  -- unchanged price at time of add
  cost               DECIMAL(14,2)  NOT NULL,  -- carat_added * price_per_carat

  -- Snapshot BEFORE the addition (this is what makes a mistake reversible)
  quantity_before    INT            NOT NULL,
  weight_before      DECIMAL(12,2)  NOT NULL,
  total_price_before DECIMAL(14,2)  NOT NULL,

  -- Snapshot AFTER the addition
  quantity_after     INT            NOT NULL,
  weight_after       DECIMAL(12,2)  NOT NULL,
  total_price_after  DECIMAL(14,2)  NOT NULL,

  added_at           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_stock_additions_gemstone_id (gemstone_id),
  INDEX idx_stock_additions_added_at    (added_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
