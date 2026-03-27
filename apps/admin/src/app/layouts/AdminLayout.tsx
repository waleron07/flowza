import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { useUiStore } from '../../shared/store/ui-store'
import { sx } from './admin-layout-styles'

const navigationItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/staff', label: 'Сотрудники' },
  { to: '/orders', label: 'Заказы' },
]

function NavigationContent() {
  const { closeSidebar } = useUiStore()

  return (
    <Box sx={sx.drawerContent}>
      <Box sx={sx.logoBlock}>
        <Typography variant="h6" fontWeight={700}>
          Flowza Admin
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Панель управления заказами
        </Typography>
      </Box>
      <Divider />
      <List sx={sx.navigation}>
        {navigationItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            onClick={closeSidebar}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.active': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
              },
              '&.active:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
            to={item.to}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}

export function AdminLayout() {
  const { logout, user } = useAuth()
  const { closeSidebar, isSidebarOpen, toggleSidebar } = useUiStore()

  return (
    <Box sx={sx.root}>
      <AppBar position="sticky" sx={sx.appBar}>
        <Toolbar sx={sx.toolbar}>
          <Box sx={sx.toolbarLeft}>
            <IconButton edge="start" onClick={toggleSidebar}>
              <MenuIcon />
            </IconButton>
            <Typography component="div" variant="h6" fontWeight={700}>
              Админка Flowza
            </Typography>
          </Box>
          <Box sx={sx.toolbarRight}>
            <Typography variant="body2" color="text.secondary">
              {user?.firstName} ({user?.role})
            </Typography>
            <Button onClick={logout} variant="outlined">
              Выйти
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex' }}>
        <Drawer
          ModalProps={{ keepMounted: true }}
          onClose={closeSidebar}
          open={isSidebarOpen}
          slotProps={{ paper: { sx: sx.drawerPaper } }}
          variant="temporary"
        >
          <NavigationContent />
        </Drawer>

        <Box component="main" sx={sx.content}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
