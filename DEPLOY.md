# SpheneGem — Deployment Runbook

Everything built in this release, in the order it must be deployed.
Work top to bottom. Do not skip section 1.

| Piece | Where it runs |
|---|---|
| Database | Hostinger MySQL (MariaDB 11.8.8), managed via phpMyAdmin |
| Backend API | Render — `https://sphenegem-inventory.onrender.com` |
| Frontend (web) | Hostinger — `https://lightcoral-otter-280862.hostingersite.com` |
| Mobile app | Capacitor Android — `com.spheneGem.stock` |

**Order matters: backups → migrations → backend → frontend.**
If the frontend goes first, the new buttons return 404. Annoying, not dangerous.
If the backend goes before the migrations, `/sell-multiple` and `/add-stock`
return a clear "run migration" error instead of corrupting anything.

---

## 0. What is in this release

- **Add More Stock** — top up an existing gemstone's quantity/carat without
  recalculating by hand. Price per carat never changes.
- **Multi-gemstone sale** — sell several stones in one transaction on one
  combined invoice.
- **2 decimal places everywhere** — inputs, display, PDFs, and (if you run
  migration 003) the database columns themselves.
- **Auto-refresh** — screens reload when shown, on tab focus, and after any
  change. No more manual browser refresh.
- **Full UI redesign** — desktop and mobile.

---

## 1. Backups — do this first

### 1a. Database

In phpMyAdmin: select the database → **Export** → **Quick** → **SQL** → Go.
Save it somewhere you will not lose it. Name it with today's date.

Or from a terminal, if you have remote MySQL access enabled:

```bash
mysqldump -h <DB_HOST> -u <DB_USER> -p <DB_NAME> > backup_before_release_$(date +%F).sql
```

`DB_HOST` / `DB_USER` / `DB_NAME` are in `backend/.env`. Never commit that file.

### 1b. Invoice PDFs — already done

**Done on 2026-08-28: 211 PDFs (42 MB, sales 515–725) saved to
`~/Desktop/SpheneGem-invoice-backup-2026-08-28/`.**

This matters because **Render's filesystem is wiped on every deploy.** Generated
invoices live in `backend/src/invoices/` and are gitignored, so they are not
rebuilt from the repo. `invoice_486.pdf` and `invoice_487.pdf` were already
destroyed by an earlier deploy — they now return 404 on the live server.

If you deploy again later, re-run this first:

```bash
export B=https://sphenegem-inventory.onrender.com
export OUT=~/Desktop/SpheneGem-invoice-backup-$(date +%F)
mkdir -p "$OUT"
cat > /tmp/sg_fetch.sh <<'EOF'
#!/bin/sh
code=$(curl -s -o "$OUT/invoice_$1.pdf" -w "%{http_code}" --max-time 30 "$B/invoices/invoice_$1.pdf")
[ "$code" = "200" ] || rm -f "$OUT/invoice_$1.pdf"
EOF
chmod +x /tmp/sg_fetch.sh
seq 1 900 | xargs -P 8 -n 1 /tmp/sg_fetch.sh
ls "$OUT" | wc -l
```

### 1c. Images — nothing to back up

Checked against the live server:

- **328** image records point at **Cloudinary** — safe, unaffected by deploys.
- **36** older records point at local filenames (`image-…jpg`). All 36 return
  **404 on the live server already.** They were lost in a previous deploy,
  before this work started. Nothing can be recovered.

New uploads go to Cloudinary (`multerCloudinary`), so this cannot happen again.

---

## 2. Commit and push

```bash
cd ~/Desktop/SpheneGem-Inventory
git status                     # confirm u139665588_gem_inventory.sql is NOT listed
git add .
git commit -m "Add stock top-up, multi-gemstone invoices, 2dp money, auto-refresh, UI redesign"
git push origin main
```

`.gitignore` now blocks database dumps (`/*.sql`, `backup_*.sql`,
`u*_gem_inventory.sql`) while still tracking `backend/migrations/*.sql`.
**Verify your dump is not in `git status` before committing.**

---

## 3. Database migrations

Run while the client is not using the system. All three are in
`backend/migrations/`, each with a matching `_rollback.sql`.

**In phpMyAdmin:** select the database → **SQL** tab → paste the file contents →
**Go**. Or use **Import** and choose the file.

### 3a. Migration 001 — stock history (required)

`001_create_stock_additions.sql`

Creates one new table, `stock_additions`. Purely additive — no existing table is
read or written. Records every stock top-up with before/after values so a typo
can be traced and reversed.

### 3b. Migration 002 — combined invoices (required)

`002_create_invoices.sql`

1. Creates the `invoices` table
2. Adds a **nullable** `invoice_id` column to `sales`
3. Adds an index on it

Existing sales keep `invoice_id = NULL` and continue to use their original
`invoice_<saleId>.pdf`. Every existing query over `sales` keeps working
untouched. Steps 2 and 3 are guarded, so re-running the file is safe.

`ADD COLUMN` is instant on MariaDB 11.8, and `sales` is ~726 rows.

### 3c. Migration 003 — money columns to DECIMAL (optional but recommended)

`003_money_columns_to_decimal.sql`

**This is the only migration that alters existing columns. Take a fresh backup
immediately before running it.**

Your money and weight columns are `float`, which cannot hold an exact 2-decimal
value. Verified against your own backup:

```
34,588.10   is actually stored as   34588.101562
```

Screens hide it because everything calls `.toFixed(2)`, but `SUM(total_amount)`
— dashboard revenue and the statement PDF grand total — adds that error across
all 726 rows.

The file is in three parts:

1. **STEP 1 — dry run.** Only `SELECT`s. Shows exactly which rows would change
   and prints your current totals. **Run this on its own first.**
2. **STEP 2 — the conversion.** `gemstones.weight / price_per_carat /
   total_price` and `sales.carat_sold / marking_price / selling_price /
   total_amount` become `DECIMAL(12,2)`.
3. **STEP 3 — verify.** Reprints the totals so you can compare against step 1.

Converting **rounds each value to the 2 decimals already shown on screen and on
every PDF**. It corrects the stored value rather than losing anything. Largest
value in your data is 50,249.50; `DECIMAL(12,2)` holds up to 9,999,999,999.99.

If you skip 003 everything still works — the app just keeps a fraction of a cent
of drift in aggregate totals.

---

## 4. Backend — Render

Render auto-deploys from `main`, so the push in section 2 may have already
started a build. Otherwise: Render dashboard → the service → **Manual Deploy** →
**Deploy latest commit**.

**Confirm these environment variables are set** (Render dashboard → Environment).
They are not in the repo:

```
PORT  DB_HOST  DB_USER  DB_PASSWORD  DB_NAME  JWT_SECRET
CLOUDINARY_CLOUD_NAME  CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET  CLOUDINARY_URL
```

Start command is `npm start` → `node src/server.js`.

Watch the deploy log for `✅ MySQL connected successfully!`, then check:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sphenegem-inventory.onrender.com/api/gemstones/all
# expect 200   (first call can take ~50s — free tier spins down when idle)
```

---

## 5. Frontend — Hostinger

```bash
cd ~/Desktop/SpheneGem-Inventory/frontend
npm ci            # or: npm install
npm run build
```

Expect **"Compiled with warnings"** and exactly one warning
(`react-hooks/exhaustive-deps` in `SalesTable.jsx`). That one is pre-existing and
harmless — fixing it means restructuring `applyDateFilter`, which changes
behaviour. Any *other* warning means something regressed.

`frontend/.env` already points the production build at Render:

```
REACT_APP_API_URL=https://sphenegem-inventory.onrender.com
```

**Upload the contents of `frontend/build/` — not the folder itself —** into
`public_html/` via Hostinger's File Manager or FTP. Replace the existing files.

Then hard-refresh the site (Ctrl/Cmd + Shift + R) so the new hashed
`main.*.js` / `main.*.css` are picked up rather than the cached old ones.

**Optional — `.htaccess`.** The app is a single page and does not use URL routes,
so it works without one. If you ever add routes, put this in `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 6. Android app — only if you distribute it

The mobile redesign (bottom tab bar, floating add button, card lists,
safe-area padding) ships through Capacitor.

```bash
cd ~/Desktop/SpheneGem-Inventory/frontend
npm run build
npx cap sync android
npx cap open android      # then Build → Generate Signed Bundle / APK
```

`capacitor.config.ts` uses `webDir: 'build'`, so `cap sync` picks up the build
from section 5. Sign with the **same keystore as previous releases**, or Play
Store will reject the upload.

**Note:** fonts (Fraunces, Manrope, IBM Plex Mono) load from Google Fonts over
the network. With no connection the app falls back to system fonts — it stays
fully usable, just not on-brand. Bundling them locally is a good follow-up.

---

## 7. Verify

Work through this on the live site after deploying.

**Money and decimals**
- [ ] Dashboard "Total Carat" shows 2 decimals (not a whole number)
- [ ] A price field refuses a third decimal as you type
- [ ] Leaving a price field turns `12` into `12.00`

**Add More Stock**
- [ ] The copper **⊕** button appears on each inventory row
- [ ] Adding 2 pcs / 5.00 ct to a 5 pcs / 10.00 ct stone at $100/ct gives
      7 pcs / 15.00 ct / $1,500.00 — and **price per carat is unchanged**
- [ ] The gemstone's image is still there afterwards

**Multi-gemstone sale**
- [ ] Tick two stones → **Sell Selected (2)** appears
- [ ] Totals compute per line and sum correctly
- [ ] One PDF downloads listing **both** stones
- [ ] Sales list shows both rows sharing one `INV-000001` chip
- [ ] Stock dropped for both stones
- [ ] Trying to sell more carat than in stock is refused with a clear message

**Old invoices**
- [ ] A sale from before this release still downloads its original invoice
      (only for sales 515–725; older ones were already lost — see 1b)

**Auto-refresh**
- [ ] Add a gemstone → it appears in the inventory **without** a manual refresh
- [ ] Record a sale → dashboard totals update when you switch to it

**Mobile** (open the site on a phone)
- [ ] Bottom tab bar; no hamburger menu
- [ ] Floating **+** button, bottom right
- [ ] Stone cards show Qty / Weight / $ct and a four-button action row
- [ ] Tapping a card shows a copper tick; a selection bar rises from the bottom
- [ ] Full-screen dialogs have a close **✕**
- [ ] Nothing sits under the notch or the home indicator

---

## 8. Rollback

**Frontend** — re-upload the previous `build/` contents, or
`git checkout <previous-commit> -- frontend && npm run build`.

**Backend** — Render dashboard → **Events** → pick the previous deploy →
**Rollback**.

**Database** — each migration has a rollback file:

| Migration | Rollback | Effect |
|---|---|---|
| 001 | `001_create_stock_additions_rollback.sql` | Drops `stock_additions`. Stock levels untouched; only the audit trail is lost. |
| 002 | `002_create_invoices_rollback.sql` | Drops `invoices` + `sales.invoice_id`. **Sales rows survive** — they just become unlinked singles. |
| 003 | `003_money_columns_to_decimal_rollback.sql` | Back to `float`. Prefer restoring your backup instead — reverting reintroduces the imprecision. |

For anything worse, restore the dump from section 1a.

---

## 9. Known issues — worth fixing next

1. **Render wipes generated files on every deploy.** This is why invoices and
   the 36 old local images were lost. Fix by storing invoice PDFs on Cloudinary
   (already used for images) or attaching a Render persistent disk. Until then,
   run the section 1b backup before every deploy.

2. **The single-sale endpoint (`POST /api/gemstones/sell`) has no transaction
   and no stock check.** It inserts the sale, then updates stock as a separate
   statement — a crash between them records a sale without deducting stock. It
   also allows selling more carat than exists. The new `/sell-multiple` endpoint
   does both correctly; the old one was left untouched so this release could not
   disturb the existing sell flow. Worth bringing up to the same standard.

3. **Fonts load from Google Fonts** — see section 6.

4. **Disk space on your Mac.** It hit 100% during this work and broke a build
   with `ENOSPC`. `frontend/node_modules` alone is 979 MB.
