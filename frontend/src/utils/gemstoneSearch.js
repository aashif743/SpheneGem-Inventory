// ─────────────────────────────────────────────────────────────
//  Inventory search
//
//  The client searches the way they think about stock: "10ct" for
//  ten-carat stones, "1500$" for stones worth about that, ">5ct",
//  "1000-2000$". So the box is unit-aware:
//
//    10ct / 10 carat      weight ≈ 10 ct   (within ±5%)
//    >5ct  <2ct  >=10ct   weight comparison
//    5-10ct               weight between 5 and 10
//    1500$  $1500         total price ≈ $1500 (within ±5%)
//    >1000$  <500$        price comparison
//    1000-2000$           price between 1000 and 2000
//    anything else        plain text: code, name, shape, remark…
//
//  A bare number with no unit keeps the old behaviour (substring
//  across every field), so nothing the client already types breaks.
//  Weights/prices are the stone's own columns — total_price is used
//  for "$" because that is what a stone is worth; per-carat rate is
//  still reachable through plain text search.
// ─────────────────────────────────────────────────────────────

const APPROX_PCT = 0.05; // "10ct" means within ±5%

// A unit only counts when it follows a number, so "octagon" / "select"
// are never mistaken for a carat search.
const HAS_CARAT = /\d\s*(ct|cts|carat|carats)\b/i;
const HAS_PRICE = /\$|\d\s*(usd|dollars?)\b/i;

const NUM = '(\\d+(?:\\.\\d+)?)';
const RANGE_RE = new RegExp(`${NUM}\\s*(?:-|to|–|—)\\s*\\$?\\s*${NUM}`, 'i');
const OP_RE    = new RegExp(`(>=|<=|>|<|=)\\s*\\$?\\s*${NUM}`);
const FIRST_NUM = new RegExp(NUM);

export function parseInventorySearch(raw) {
  const q = (raw || '').trim();
  if (!q) return { kind: 'empty' };

  const hasPrice = HAS_PRICE.test(q);
  const hasCarat = HAS_CARAT.test(q);

  if (hasPrice || hasCarat) {
    const kind = hasPrice ? 'price' : 'weight';

    const range = q.match(RANGE_RE);
    if (range) {
      const a = parseFloat(range[1]);
      const b = parseFloat(range[2]);
      return { kind, mode: 'range', lo: Math.min(a, b), hi: Math.max(a, b) };
    }
    const op = q.match(OP_RE);
    if (op) return { kind, mode: 'op', op: op[1], value: parseFloat(op[2]) };

    const num = q.match(FIRST_NUM);
    if (num) return { kind, mode: 'approx', value: parseFloat(num[1]) };
    // a unit but no number — fall through to text
  }

  return { kind: 'text', q: q.toLowerCase() };
}

function fieldValue(gem, kind) {
  return kind === 'price'
    ? (parseFloat(gem.total_price) || 0)
    : (parseFloat(gem.weight) || 0);
}

export function matchesInventorySearch(gem, parsed) {
  switch (parsed.kind) {
    case 'empty':
      return true;

    case 'text': {
      const q = parsed.q;
      return (
        (gem.code ?? '').toLowerCase().includes(q) ||
        (gem.name ?? '').toLowerCase().includes(q) ||
        (gem.shape ?? '').toLowerCase().includes(q) ||
        String(gem.weight ?? '').includes(q) ||
        String(gem.price_per_carat ?? '').includes(q) ||
        String(gem.total_price ?? '').includes(q) ||
        (gem.remark ?? '').toLowerCase().includes(q)
      );
    }

    case 'weight':
    case 'price': {
      const v = fieldValue(gem, parsed.kind);
      if (parsed.mode === 'range') return v >= parsed.lo && v <= parsed.hi;
      if (parsed.mode === 'op') {
        switch (parsed.op) {
          case '>':  return v >  parsed.value;
          case '>=': return v >= parsed.value;
          case '<':  return v <  parsed.value;
          case '<=': return v <= parsed.value;
          case '=':  return Math.abs(v - parsed.value) < 0.005;
          default:   return false;
        }
      }
      // approx ±5%
      return v >= parsed.value * (1 - APPROX_PCT)
          && v <= parsed.value * (1 + APPROX_PCT);
    }

    default:
      return true;
  }
}

// One-line description for the little chip under the search box, so the
// user always sees how their query was understood.
export function describeInventorySearch(parsed) {
  if (!parsed || parsed.kind === 'empty') return '';

  if (parsed.kind === 'text') return `Text: “${parsed.q}”`;

  const isPrice = parsed.kind === 'price';
  const label = isPrice ? 'Price' : 'Weight';
  const fmt = isPrice
    ? (n) => '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : (n) => `${n} ct`;

  if (parsed.mode === 'range') return `${label}  ${fmt(parsed.lo)} – ${fmt(parsed.hi)}`;
  if (parsed.mode === 'op')    return `${label}  ${parsed.op} ${fmt(parsed.value)}`;
  return `${label}  ≈ ${fmt(parsed.value)}  (±5%)`;
}
