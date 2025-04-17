import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
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
  Button,
  Avatar,
  Badge,
  styled
} from '@mui/material';
import {
  Menu,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

import GemstoneTable from './components/GemstoneTable';
import AddGemstoneForm from './components/AddGemstoneForm';
import SalesTable from './components/SalesTable';
import Dashboard from './components/Dashboard';

const drawerWidth = 240;

const App = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'stock', label: 'Inventory', icon: <InventoryIcon /> },
    { key: 'sales', label: 'Sales', icon: <ReceiptIcon /> },
  ];

  const StyledDrawer = styled(Drawer)(({ theme }) => ({
    '& .MuiDrawer-paper': {
      backgroundColor: theme.palette.primary.dark,
      color: theme.palette.common.white,
      width: collapsed ? 72 : drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      overflowX: 'hidden',
      borderRight: 'none',
      boxShadow: theme.shadows[8],
      position: 'fixed',
      height: '100vh'
    },
  }));

  const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0, 1.5),
    padding: theme.spacing(1, 2),
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.light,
      '&:hover': {
        backgroundColor: theme.palette.primary.light,
      }
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    }
  }));

  const drawer = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              src="/Sphene.png" 
              alt="SpheneGem Logo" 
              sx={{ width: 40, height: 40, mr: 1.5 }}
              variant="rounded"
            />
            <Typography variant="h6" noWrap>
              SpheneGem
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton 
            onClick={handleCollapseToggle} 
            size="small"
            sx={{ color: 'inherit' }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <List sx={{ flex: 1, pt: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding sx={{ display: 'block' }}>
            <StyledListItemButton
              onClick={() => {
                setView(item.key);
                if (isMobile) setMobileOpen(false);
              }}
              selected={view === item.key}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} sx={{ ml: 1 }} />}
            </StyledListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={!collapsed && <AddIcon />}
          fullWidth
          size="large"
          onClick={() => {
            setView('add');
            if (isMobile) setMobileOpen(false);
          }}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          }}
        >
          {!collapsed && 'Add Stock'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${collapsed ? 72 : drawerWidth}px)` },
          ml: { md: `${collapsed ? 72 : drawerWidth}px` },
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {view === 'dashboard' && 'Dashboard'}
            {view === 'stock' && 'Inventory Management'}
            {view === 'add' && 'Add New Stock'}
            {view === 'sales' && 'Sales Records'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton color="inherit">
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box component="nav">
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box',
                width: drawerWidth
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <StyledDrawer
            variant="permanent"
            open
          >
            {drawer}
          </StyledDrawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 10,
          pl: 3,
          pr: 3,
          width: { md: `calc(100% - ${collapsed ? 72 : drawerWidth}px)` },
          ml: { md: `${collapsed ? 72 : drawerWidth}px` },
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          backgroundColor: 'background.default',
          minHeight: '100vh'
        }}
      >
        <Box sx={{ 
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          backgroundColor: 'background.paper',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          minHeight: 'calc(100vh - 100px)' // account for AppBar height
        }}>
          {view === 'dashboard' && <Dashboard />}
          {view === 'stock' && <GemstoneTable />}
          {view === 'add' && <AddGemstoneForm />}
          {view === 'sales' && <SalesTable />}
        </Box>
      </Box>
    </Box>
  );
};

export default App;
