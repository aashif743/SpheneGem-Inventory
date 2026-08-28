import React, { useState, useMemo } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Card,
  Grid,
  Skeleton,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Diamond as DiamondIcon,
  Scale as ScaleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingIcon,
  ArrowUpward,
  ArrowDownward,
  Remove as FlatIcon,
} from '@mui/icons-material';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { DATA } from '../services/dataRefresh';
import { format2, money2 } from '../utils/decimal';
import { TOKENS, FONTS, METRIC_ACCENTS } from '../theme';

// Gem-toned series palette — greens through to copper, all inside the brand.
const SERIES = ['#1B5E20', '#2E7D32', '#43A047', '#6D9773', '#BF7B30', '#E3A857', '#1F5F8B'];

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Module-level cache — survives component unmount/remount.
// Used only to paint the screen instantly; freshness is now handled by
// useAutoRefresh (on show, on focus, on data change) rather than by a TTL.
let _cache = null;

// ───────────────────────────────────────────────────────────────────────────
//  Sparkline — a hand-rolled inline SVG rather than a chart instance per card.
//  Lighter, and it lets the line draw itself in on first paint.
// ───────────────────────────────────────────────────────────────────────────
const Sparkline = ({ values = [], color = TOKENS.verdant, width = 84, height = 30 }) => {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <Box sx={{ width, height }} />;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1);
  const pad = 3;

  const coords = pts.map((v, i) => [
    i * stepX,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `sp-${color.replace('#', '')}`;
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 400, '--sg-len': 400, animation: 'sg-draw .9s ease-out .15s both' }}
      />
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} />
      <circle cx={lastX} cy={lastY} r="5.5" fill={color} opacity="0.18" />
    </svg>
  );
};

// ───────────────────────────────────────────────────────────────────────────
//  Metric panel — the signature element.
//  Reads like a line on a lab certificate: letterspaced label, then the value
//  set large in tabular figures. Light sweeps across it on hover, the way it
//  travels across a cut stone.
// ───────────────────────────────────────────────────────────────────────────
const MetricPanel = ({ eyebrow, value, unit, icon, accent, spark, delta, footnote, loading }) => (
  <Card
    sx={{
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      p: { xs: 1.5, sm: 2.25 },
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 0.9, sm: 1.25 },
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: 5,
        borderColor: TOKENS.jadeLine,
      },
      // Accent edge identifies the metric at a glance
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 3,
        background: `linear-gradient(180deg, ${accent} 0%, ${accent}44 100%)`,
      },
      // The sweep
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: '38%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.62), transparent)',
        transform: 'translateX(-120%) skewX(-18deg)',
        pointerEvents: 'none',
        opacity: 0,
      },
      '&:hover::after': { opacity: 1, animation: 'sg-sweep .85s cubic-bezier(.3,.6,.3,1)' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, minWidth: 0 }}>
        <Box
          sx={{
            width: 26, height: 26, borderRadius: '7px', flexShrink: 0,
            display: 'grid', placeItems: 'center',
            bgcolor: `${accent}14`, color: accent,
          }}
        >
          {icon}
        </Box>
        <Typography variant="eyebrow" noWrap>{eyebrow}</Typography>
      </Box>
      {!loading && spark && (
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Sparkline values={spark} color={accent} />
        </Box>
      )}
    </Box>

    <Box>
      {loading ? (
        <Skeleton variant="text" width="65%" height={42} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.7, flexWrap: 'wrap' }}>
          <Typography
            variant="metric"
            sx={{ color: TOKENS.text, fontSize: { xs: '1.28rem', sm: '1.72rem' } }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: TOKENS.textFaint }}>
              {unit}
            </Typography>
          )}
        </Box>
      )}
    </Box>

    <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 0.8, minHeight: 22, flexWrap: 'wrap' }}>
      {loading ? (
        <Skeleton variant="text" width="55%" height={20} />
      ) : (
        <>
          {delta && (
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                px: 0.75, py: '2px', borderRadius: '6px',
                bgcolor: delta.dir === 'up' ? '#E9F2EA' : delta.dir === 'down' ? TOKENS.dangerWash : '#F0EFEA',
                color:   delta.dir === 'up' ? TOKENS.verdant : delta.dir === 'down' ? TOKENS.danger : TOKENS.textMute,
              }}
            >
              {delta.dir === 'up' ? <ArrowUpward sx={{ fontSize: 12 }} />
                : delta.dir === 'down' ? <ArrowDownward sx={{ fontSize: 12 }} />
                : <FlatIcon sx={{ fontSize: 12 }} />}
              <Typography sx={{ fontFamily: FONTS.DATA, fontSize: '0.7rem', fontWeight: 600 }}>
                {delta.label}
              </Typography>
            </Box>
          )}
          {footnote && (
            <Typography
              sx={{
                fontSize: { xs: '0.68rem', sm: '0.735rem' },
                color: TOKENS.textMute,
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              {footnote}
            </Typography>
          )}
        </>
      )}
    </Box>
  </Card>
);

// ── Panel wrapper for charts ───────────────────────────────────────────────
const ChartCard = ({ eyebrow, title, note, children, height = 280, loading }) => (
  <Card sx={{ p: { xs: 1.75, sm: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ mb: 2 }}>
      <Typography variant="eyebrow" sx={{ display: 'block', color: TOKENS.copper }}>{eyebrow}</Typography>
      <Typography sx={{ fontFamily: FONTS.DISPLAY, fontWeight: 600, fontSize: '1.08rem', letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {note && (
        <Typography sx={{ fontSize: '0.755rem', color: TOKENS.textFaint, mt: 0.25 }}>{note}</Typography>
      )}
    </Box>
    <Box sx={{ flex: 1, minHeight: height }}>
      {loading ? <Skeleton variant="rounded" height={height} /> : children}
    </Box>
  </Card>
);

// ── Tooltip shared by every chart ──────────────────────────────────────────
const GemTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <Box
      sx={{
        bgcolor: TOKENS.ink,
        color: '#fff',
        px: 1.5, py: 1,
        borderRadius: '9px',
        boxShadow: 6,
        minWidth: 128,
      }}
    >
      <Typography variant="eyebrow" sx={{ display: 'block', color: TOKENS.brass, mb: 0.4 }}>
        {label ?? payload[0]?.name}
      </Typography>
      {payload.map((p, i) => (
        <Typography
          key={i}
          sx={{ fontFamily: FONTS.DATA, fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.5 }}
        >
          {formatter ? formatter(p.value) : p.value}
        </Typography>
      ))}
    </Box>
  );
};

const AXIS = {
  tick: { fontSize: 11, fill: TOKENS.textFaint, fontFamily: FONTS.DATA },
  axisLine: false,
  tickLine: false,
};

const Dashboard = ({ active = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Seed from the cache so the screen paints instantly; a fresh fetch follows.
  const [stats, setStats] = useState(_cache?.stats ?? {
    totalGemstones: 0,
    totalCarat: 0,
    totalSales: 0,
    totalRevenue: 0,
  });

  const [chartData, setChartData] = useState(_cache?.chartData ?? {
    monthlyGemstones: [],
    revenueByGemstone: [],
    salesData: [],
  });

  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(false);

  // Refresh when shown, on tab focus, and whenever stock or sales change —
  // the totals here are derived from both.
  useAutoRefresh({
    active,
    watch: [DATA.DASHBOARD],
    onRefresh: () => fetchDashboardStats(),
  });

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/dashboard/stats`,
        { timeout: 30000 }
      );

      const newStats = {
        totalGemstones: response.data.totalGemstones,
        totalCarat: response.data.totalCarat,
        totalSales: response.data.totalSales,
        totalRevenue: response.data.totalRevenue,
      };

      const newChartData = {
        monthlyGemstones: response.data.monthlyGemstones,
        revenueByGemstone: response.data.revenueByGemstone,
        salesData: response.data.monthlyGemstones.map(item => ({
          day: item.month,
          value: item.count
        }))
      };

      // Store in module-level cache
      _cache = { stats: newStats, chartData: newChartData };

      setStats(newStats);
      setChartData(newChartData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Everything below is derived from data already fetched above ──────────
  const derived = useMemo(() => {
    const monthly = chartData.monthlyGemstones ?? [];
    const counts = monthly.map((m) => Number(m.count) || 0);

    const last = counts[counts.length - 1] ?? 0;
    const prev = counts[counts.length - 2] ?? 0;
    let intakeDelta = null;
    if (counts.length >= 2) {
      if (prev === 0) {
        intakeDelta = last > 0 ? { dir: 'up', label: 'new' } : { dir: 'flat', label: '0%' };
      } else {
        const pct = ((last - prev) / prev) * 100;
        intakeDelta = {
          dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat',
          label: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
        };
      }
    }

    const stones = Number(stats.totalGemstones) || 0;
    const carat  = Number(stats.totalCarat) || 0;
    const sales  = Number(stats.totalSales) || 0;
    const rev    = Number(stats.totalRevenue) || 0;

    const avgCarat  = stones > 0 ? carat / stones : 0;
    const avgPerSale = sales > 0 ? rev / sales : 0;

    // Revenue leaderboard with share of total
    const byGem = [...(chartData.revenueByGemstone ?? [])]
      .map((r) => ({ name: r.name || 'Unnamed', value: Number(r.total_revenue) || 0 }))
      .sort((a, b) => b.value - a.value);
    const gemTotal = byGem.reduce((s, r) => s + r.value, 0);
    const leaders = byGem.slice(0, 6).map((r) => ({
      ...r,
      share: gemTotal > 0 ? (r.value / gemTotal) * 100 : 0,
    }));

    return { counts, intakeDelta, avgCarat, avgPerSale, byGem, gemTotal, leaders, monthly };
  }, [stats, chartData]);

  const hasIntake = derived.monthly.length > 0;
  const hasRevenue = derived.byGem.length > 0;

  return (
    <Box sx={{ pb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          Couldn't load the dashboard. It will retry when you return to this screen.
        </Alert>
      )}

      {/* ── Metric row ── */}
      <Grid container spacing={2} className="sg-stagger" sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={6} lg={3}>
          <MetricPanel
            eyebrow="In Stock"
            value={Number(stats.totalGemstones || 0).toLocaleString('en-US')}
            unit="pieces"
            icon={<DiamondIcon sx={{ fontSize: 15 }} />}
            accent={METRIC_ACCENTS.stock}
            spark={derived.counts}
            delta={derived.intakeDelta}
            footnote="added this month"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={6} lg={3}>
          <MetricPanel
            eyebrow="Total Carat"
            value={format2(stats.totalCarat)}
            unit="ct"
            icon={<ScaleIcon sx={{ fontSize: 15 }} />}
            accent={METRIC_ACCENTS.carat}
            footnote={`${format2(derived.avgCarat)} ct average per stone`}
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={6} lg={3}>
          <MetricPanel
            eyebrow="Sales Recorded"
            value={Number(stats.totalSales || 0).toLocaleString('en-US')}
            unit="invoiced"
            icon={<TrendingIcon sx={{ fontSize: 15 }} />}
            accent={METRIC_ACCENTS.sales}
            footnote="all time"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} sm={6} lg={3}>
          <MetricPanel
            eyebrow="Revenue"
            value={money2(stats.totalRevenue)}
            icon={<MoneyIcon sx={{ fontSize: 15 }} />}
            accent={METRIC_ACCENTS.revenue}
            footnote={`${money2(derived.avgPerSale)} average per sale`}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard
            eyebrow="Intake"
            title="Gemstones Added"
            note="Count of stones entered into stock each month"
            height={isMobile ? 210 : 268}
            loading={loading}
          >
            {hasIntake ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={derived.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sgIntake" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={TOKENS.verdant} stopOpacity={0.30} />
                      <stop offset="100%" stopColor={TOKENS.verdant} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={TOKENS.line} vertical={false} />
                  <XAxis dataKey="month" {...AXIS} dy={6} />
                  <YAxis allowDecimals={false} {...AXIS} width={44} />
                  <Tooltip
                    content={<GemTooltip formatter={(v) => `${v} stone${v === 1 ? '' : 's'}`} />}
                    cursor={{ stroke: TOKENS.jadeLine, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={TOKENS.verdant}
                    strokeWidth={2.25}
                    fill="url(#sgIntake)"
                    dot={{ r: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: TOKENS.verdant }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No stock has been added yet." />
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <ChartCard
            eyebrow="Composition"
            title="Revenue by Gemstone"
            note="Share of all-time revenue"
            height={isMobile ? 210 : 268}
            loading={loading}
          >
            {hasRevenue ? (
              <Box sx={{ position: 'relative', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={derived.byGem}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                      animationDuration={800}
                    >
                      {derived.byGem.map((entry, i) => (
                        <Cell key={i} fill={SERIES[i % SERIES.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<GemTooltip formatter={(v) => money2(v)} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Total sits in the hole of the donut, where the eye lands */}
                <Box
                  sx={{
                    position: 'absolute', inset: 0,
                    display: 'grid', placeItems: 'center',
                    pointerEvents: 'none', textAlign: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="eyebrow" sx={{ display: 'block' }}>Total</Typography>
                    <Typography
                      sx={{
                        fontFamily: FONTS.DATA, fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.12rem' },
                        letterSpacing: '-0.03em', color: TOKENS.text,
                      }}
                    >
                      {money2(derived.gemTotal)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <EmptyChart message="No sales recorded yet." />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── Leaderboard ── */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <ChartCard
            eyebrow="Monthly"
            title="Intake Volume"
            note="The same stock intake, month by month"
            height={isMobile ? 200 : 250}
            loading={loading}
          >
            {hasIntake ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke={TOKENS.line} vertical={false} />
                  <XAxis dataKey="month" {...AXIS} dy={6} />
                  <YAxis allowDecimals={false} {...AXIS} width={44} />
                  <Tooltip
                    content={<GemTooltip formatter={(v) => `${v} stone${v === 1 ? '' : 's'}`} />}
                    cursor={{ fill: 'rgba(27,94,32,0.05)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={38} animationDuration={800}>
                    {derived.monthly.map((_, i) => (
                      <Cell key={i} fill={i === derived.monthly.length - 1 ? TOKENS.copper : TOKENS.sprout} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No stock has been added yet." />
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="eyebrow" sx={{ display: 'block', color: TOKENS.copper }}>
                Ranking
              </Typography>
              <Typography sx={{ fontFamily: FONTS.DISPLAY, fontWeight: 600, fontSize: '1.08rem', letterSpacing: '-0.01em' }}>
                Top Earners
              </Typography>
              <Typography sx={{ fontSize: '0.755rem', color: TOKENS.textFaint, mt: 0.25 }}>
                Highest revenue by gemstone name
              </Typography>
            </Box>

            {loading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} variant="text" height={40} />)
            ) : derived.leaders.length === 0 ? (
              <EmptyChart message="No sales recorded yet." />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {derived.leaders.map((row, i) => (
                  <Box key={row.name}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontFamily: FONTS.DATA, fontSize: '0.7rem', fontWeight: 600,
                            color: TOKENS.textFaint, width: 16, flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontFamily: FONTS.DATA, fontSize: '0.83rem', fontWeight: 600, flexShrink: 0 }}
                      >
                        {money2(row.value)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(2, row.share)}
                        sx={{
                          flex: 1, height: 5, borderRadius: 99,
                          bgcolor: TOKENS.lineSoft,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 99,
                            backgroundColor: SERIES[i % SERIES.length],
                            transition: 'transform 1s cubic-bezier(.2,.7,.3,1)',
                          },
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: FONTS.DATA, fontSize: '0.7rem',
                          color: TOKENS.textMute, width: 40, textAlign: 'right', flexShrink: 0,
                        }}
                      >
                        {row.share.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// An empty screen is an invitation to act, not a dead end.
const EmptyChart = ({ message }) => (
  <Box
    sx={{
      height: '100%', minHeight: 160,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0.5,
      color: TOKENS.textFaint, textAlign: 'center', px: 2,
    }}
  >
    <DiamondIcon sx={{ fontSize: 26, opacity: 0.35 }} />
    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{message}</Typography>
    <Typography sx={{ fontSize: '0.76rem' }}>
      This chart fills in as you record stock and sales.
    </Typography>
  </Box>
);

export default Dashboard;
