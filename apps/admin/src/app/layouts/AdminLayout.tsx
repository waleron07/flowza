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
import type { PropsWithChildren } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { useUiStore } from '../../shared/store/ui-store'
import { sx } from './admin-layout-styles'

export type AdminNavigationItem = {
  to: string
  label: string
}

function NavigationContent({
  navigationItems,
  subtitle,
  title,
}: {
  navigationItems: AdminNavigationItem[]
  subtitle: string
  title: string
}) {
  const { closeSidebar } = useUiStore()

  return (
    <Box sx={sx.drawerContent}>
      <Box sx={sx.logoBlock}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
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

export function AdminLayout({
  children,
  navigationItems,
  subtitle,
  title,
}: PropsWithChildren<{
  navigationItems: AdminNavigationItem[]
  subtitle: string
  title: string
}>) {
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
              {title}
            </Typography>
          </Box>
          <Box sx={sx.toolbarRight}>
            <Typography variant="body2" color="text.secondary">
              {user?.login} ({user?.role})
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
          <NavigationContent
            navigationItems={navigationItems}
            subtitle={subtitle}
            title={title}
          />
        </Drawer>

        <Box component="main" sx={sx.content}>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  )
}
