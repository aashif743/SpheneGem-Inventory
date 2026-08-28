import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Button,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';

import GemstoneTable from './components/GemstoneTable';
import AddGemstoneForm from './components/AddGemstoneForm';
import SalesTable from './components/SalesTable';
import Dashboard from './components/Dashboard';
import { DATA, notifyDataChanged } from './services/dataRefresh';
import { TOKENS, FONTS } from './theme';

const RAIL_W = 244;
const RAIL_W_COLLAPSED = 76;

// Eyebrow + title for each screen. The eyebrow says where you are; the title
// names the screen. Both in the interface's own voice, no marketing.
const VIEW_META = {
  dashboard: { eyebrow: 'Overview',  title: 'Dashboard',      short: 'Dashboard' },
  stock:     { eyebrow: 'Inventory', title: 'Gemstone Stock', short: 'Inventory' },
  add:       { eyebrow: 'Inventory', title: 'Add a Gemstone', short: 'Add Stone' },
  sales:     { eyebrow: 'Records',   title: 'Sales & Invoices', short: 'Sales' },
};

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { key: 'stock',     label: 'Inventory', icon: InventoryIcon },
  { key: 'sales',     label: 'Sales',     icon: ReceiptIcon },
];

const App = () => {
  const [view, setView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleCollapseToggle = () => setCollapsed(!collapsed);

  // Recharts needs a resize event to remeasure after being hidden with display:none
  useEffect(() => {
    if (view === 'dashboard') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
  }, [view]);

  // Adding a gemstone from the sidebar form used to go nowhere: the form was
  // rendered with no props, so its onAdded callback was undefined and the
  // inventory table never learned the data had changed. Announce the change
  // and jump straight to the inventory so the new stone is visible at once.
  const handleGemstoneAdded = () => {
    notifyDataChanged([DATA.GEMSTONES, DATA.DASHBOARD]);
    setSnackbar({ open: true, message: 'Gemstone added', severity: 'success' });
    setView('stock');
  };

  const railWidth = collapsed ? RAIL_W_COLLAPSED : RAIL_W;
  const meta = VIEW_META[view] ?? VIEW_META.dashboard;

  // ── Desktop rail: a jeweller's dark tray the bright content sits on ──
  const rail = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: TOKENS.ink,
        color: '#fff',
        backgroundImage: `radial-gradient(120% 55% at 50% -8%, rgba(191,123,48,0.16) 0%, rgba(191,123,48,0) 62%)`,
      }}
    >
      <Box
        sx={{
          px: collapsed ? 0 : 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0 }}>
          <Box
            component="img"
            src="/Sphene.png"
            alt=""
            sx={{
              width: 36, height: 36, borderRadius: '9px', flexShrink: 0,
              bgcolor: '#fff', p: '3px', objectFit: 'contain',
              boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            }}
          />
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: FONTS.DISPLAY, fontWeight: 600, fontSize: '1.06rem',
                  lineHeight: 1.15, letterSpacing: '-0.01em', color: '#fff',
                }}
              >
                Sphene
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.17em',
                  textTransform: 'uppercase', color: TOKENS.brass, lineHeight: 1.5,
                }}
              >
                Gem &amp; Jewelry
              </Typography>
            </Box>
          )}
        </Box>

        <Tooltip title="Collapse menu" placement="right">
          <IconButton
            onClick={handleCollapseToggle}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.55)',
              display: collapsed ? 'none' : 'inline-flex',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <IconButton
            onClick={handleCollapseToggle}
            size="small"
            sx={{ color: 'rgba(255,255,255,0.55)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Divider sx={{ borderColor: TOKENS.inkLine, mx: collapsed ? 1.5 : 2.5 }} />

      <List sx={{ flex: 1, pt: 2, px: collapsed ? 1 : 1.5 }}>
        {!collapsed && (
          <Typography
            variant="eyebrow"
            sx={{ display: 'block', px: 1.5, pb: 1, color: 'rgba(255,255,255,0.34)' }}
          >
            Workspace
          </Typography>
        )}

        {NAV.map((item) => {
          const selected = view === item.key;
          const Icon = item.icon;
          return (
            <ListItem key={item.key} disablePadding sx={{ display: 'block', mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  onClick={() => setView(item.key)}
                  sx={{
                    position: 'relative',
                    borderRadius: '10px',
                    px: collapsed ? 0 : 1.5,
                    py: 1.05,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: selected ? '#fff' : 'rgba(255,255,255,0.62)',
                    bgcolor: selected ? 'rgba(255,255,255,0.085)' : 'transparent',
                    transition: 'background-color .18s ease, color .18s ease',
                    '&:hover': {
                      bgcolor: selected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0, top: '50%',
                      width: 3, height: selected ? 20 : 0,
                      borderRadius: 99, bgcolor: TOKENS.brass,
                      transform: 'translateY(-50%)',
                      transition: 'height .22s cubic-bezier(.2,.7,.3,1)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 'auto' : 34,
                      color: selected ? TOKENS.brass : 'inherit',
                      transition: 'color .18s ease',
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: selected ? 700 : 600,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: collapsed ? 1.5 : 2 }}>
        <Tooltip title={collapsed ? 'Add a gemstone' : ''} placement="right">
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={collapsed ? null : <AddIcon />}
            onClick={() => setView('add')}
            sx={{ minWidth: 0, px: collapsed ? 0 : 2, py: 1.1, '& .MuiButton-startIcon': { mr: 0.8 } }}
          >
            {collapsed ? <AddIcon sx={{ fontSize: 20 }} /> : 'Add Gemstone'}
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );

  // ── Mobile: bottom tab bar + floating add button ──
  // A hamburger drawer hides the whole app behind a tap and puts navigation at
  // the top of the screen, out of thumb reach. Tabs keep every screen one tap
  // away and sit where the thumb already rests.
  const bottomBar = (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: (t) => t.zIndex.appBar + 2,
        bgcolor: 'rgba(12,23,17,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${TOKENS.inkLine}`,
        pb: 'var(--safe-bottom)',
        pl: 'var(--safe-left)',
        pr: 'var(--safe-right)',
      }}
    >
      <Box sx={{ display: 'flex', height: 'var(--tabbar-h)' }}>
        {NAV.map((item) => {
          const selected = view === item.key || (item.key === 'stock' && view === 'add');
          const Icon = item.icon;
          return (
            <ButtonBase
              key={item.key}
              onClick={() => setView(item.key)}
              aria-current={selected ? 'page' : undefined}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                position: 'relative',
                color: selected ? TOKENS.brass : 'rgba(255,255,255,0.55)',
                transition: 'color .18s ease',
                // Copper rule above the active tab
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: 2,
                  width: selected ? 30 : 0,
                  borderRadius: 99,
                  bgcolor: TOKENS.brass,
                  transition: 'width .24s cubic-bezier(.2,.7,.3,1)',
                },
              }}
            >
              <Icon sx={{ fontSize: 22 }} />
              <Typography
                sx={{
                  fontSize: '0.655rem',
                  fontWeight: selected ? 800 : 600,
                  letterSpacing: '0.03em',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );

  const fab = (
    <ButtonBase
      onClick={() => setView('add')}
      aria-label="Add a gemstone"
      sx={{
        position: 'fixed',
        right: 'calc(16px + var(--safe-right))',
        bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)',
        zIndex: (t) => t.zIndex.appBar + 3,
        width: 56, height: 56,
        borderRadius: '18px',
        color: '#fff',
        background: `linear-gradient(140deg, ${TOKENS.brass} 0%, ${TOKENS.copper} 100%)`,
        boxShadow: '0 8px 22px rgba(191,123,48,0.42)',
        transition: 'transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s ease',
        '&:active': { transform: 'scale(0.93)', boxShadow: '0 4px 12px rgba(191,123,48,0.40)' },
      }}
    >
      <AddIcon sx={{ fontSize: 27 }} />
    </ButtonBase>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: TOKENS.parcel }}>
      {/* ── Header ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${railWidth}px)` },
          ml: { md: `${railWidth}px` },
          transition: (t) => t.transitions.create(['width', 'margin'], {
            easing: t.transitions.easing.sharp,
            duration: t.transitions.duration.leavingScreen,
          }),
          bgcolor: 'rgba(246,245,240,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${TOKENS.line}`,
          color: TOKENS.text,
          pt: 'var(--safe-top)',
          pl: 'var(--safe-left)',
          pr: 'var(--safe-right)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, md: 74 }, px: { xs: 2, md: 3 }, gap: 1.5 }}>
          {/* On mobile the rail is gone, so the logo anchors the brand here */}
          {isMobile && (
            <Box
              component="img"
              src="/Sphene.png"
              alt=""
              sx={{
                width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
                bgcolor: '#fff', p: '2px', objectFit: 'contain',
                border: `1px solid ${TOKENS.line}`,
              }}
            />
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="eyebrow" sx={{ display: 'block', color: TOKENS.copper }}>
              {meta.eyebrow}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontFamily: FONTS.DISPLAY,
                fontWeight: 600,
                fontSize: { xs: '1.06rem', md: '1.34rem' },
                letterSpacing: '-0.015em',
                lineHeight: 1.2,
              }}
            >
              {isMobile ? meta.short : meta.title}
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
            <Typography variant="eyebrow" sx={{ display: 'block' }}>Today</Typography>
            <Typography
              variant="data"
              sx={{ fontSize: '0.82rem', color: TOKENS.textMute, fontWeight: 600 }}
            >
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Desktop rail ── */}
      {!isMobile && (
        <Box component="nav" sx={{ width: railWidth, flexShrink: 0 }}>
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: railWidth,
                boxSizing: 'border-box',
                border: 'none',
                overflowX: 'hidden',
                bgcolor: TOKENS.ink,
                transition: (t) => t.transitions.create('width', {
                  easing: t.transitions.easing.sharp,
                  duration: t.transitions.duration.leavingScreen,
                }),
              },
            }}
          >
            {rail}
          </Drawer>
        </Box>
      )}

      {/* ── Content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          pt: { xs: 'calc(58px + var(--safe-top) + 12px)', md: '86px' },
          px: { xs: 1.75, sm: 2.5, md: 3.5 },
          pb: {
            xs: 'calc(var(--tabbar-h) + var(--safe-bottom) + 92px)',
            md: 5,
          },
        }}
      >
        <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
          {/* All four screens stay mounted and are hidden with display:none.
              Each therefore needs to be told whether it is the visible one so
              it can refresh itself when shown — a mount-time fetch only ever
              runs once for the whole session. */}
          <Box sx={{ display: view === 'dashboard' ? 'block' : 'none' }}>
            <Box key={`d-${view === 'dashboard'}`} className={view === 'dashboard' ? 'sg-view' : undefined}>
              <Dashboard active={view === 'dashboard'} />
            </Box>
          </Box>

          <Box sx={{ display: view === 'stock' ? 'block' : 'none' }}>
            <Box key={`s-${view === 'stock'}`} className={view === 'stock' ? 'sg-view' : undefined}>
              <GemstoneTable active={view === 'stock'} />
            </Box>
          </Box>

          <Box sx={{ display: view === 'add' ? 'block' : 'none' }}>
            <Box key={`a-${view === 'add'}`} className={view === 'add' ? 'sg-view' : undefined}>
              <AddGemstoneForm
                onAdded={handleGemstoneAdded}
                onClose={() => setView('stock')}
                setSnackbarMessage={(message) => setSnackbar((s) => ({ ...s, message }))}
                setSnackbarSeverity={(severity) => setSnackbar((s) => ({ ...s, severity }))}
                setShowSnackbar={(open) => setSnackbar((s) => ({ ...s, open }))}
              />
            </Box>
          </Box>

          <Box sx={{ display: view === 'sales' ? 'block' : 'none' }}>
            <Box key={`r-${view === 'sales'}`} className={view === 'sales' ? 'sg-view' : undefined}>
              <SalesTable active={view === 'sales'} />
            </Box>
          </Box>
        </Box>
      </Box>

      {isMobile && view !== 'add' && fab}
      {isMobile && bottomBar}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          // Clear the tab bar so a toast never covers navigation
          bottom: { xs: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px) !important', md: '24px' },
        }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600, minWidth: 280, boxShadow: 6 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;
