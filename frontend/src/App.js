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
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Menu } from '@mui/icons-material';

import GemstoneTable from './components/GemstoneTable';
import AddGemstoneForm from './components/AddGemstoneForm';
import SalesTable from './components/SalesTable';
import Dashboard from './components/Dashboard';

const drawerWidth = 220;

const App = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState('dashboard');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'stock', label: 'Stocks' },
    { key: 'sales', label: 'Sales' },
    { key: 'add', label: '+ Add New Stock' },
  ];

  const drawer = (
    <Box sx={{ textAlign: 'center', backgroundColor: '#2c3e50', height: '100%', color: 'white' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        SpheneGem
      </Typography>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              onClick={() => {
                setView(item.key);
                if (isMobile) setMobileOpen(false);
              }}
              selected={view === item.key}
              sx={{
                textAlign: 'left',
                pl: 3,
                color: 'white',
                '&.Mui-selected': { backgroundColor: '#3498db' },
                '&:hover': { backgroundColor: '#34495e' },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar with Menu */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div">
            Acme Gemstone Inventory
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Responsive Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: '#2c3e50',
              color: 'white',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              backgroundColor: '#2c3e50',
              color: 'white',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#f5f6fa',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {view === 'dashboard' && <Dashboard />}
        {view === 'stock' && <GemstoneTable />}
        {view === 'add' && <AddGemstoneForm />}
        {view === 'sales' && <SalesTable />}
      </Box>
    </Box>
  );
};

export default App;
