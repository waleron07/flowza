import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../../features/auth/model/useAuth'
import { useHealthQuery } from '../../features/system/api/useHealthQuery'
import { useUiStore } from '../../shared/store/ui-store'

export function DashboardPage() {
  const { user } = useAuth()
  const { isSidebarOpen, toggleSidebar } = useUiStore()
  const healthQuery = useHealthQuery()

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 800,
        p: 4,
        borderRadius: 4,
      }}
    >
      <Stack spacing={2.5}>
        <Typography component="h1" variant="h4" fontWeight={700}>
          Dashboard Flowza
        </Typography>
        <Typography variant="body1">
          Вы вошли как <strong>{user?.login}</strong> ({user?.role}).
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Базовый layout админки уже подключен. Дальше можно переходить к реальным
          рабочим разделам: staff-пользователи, продукты и заказы.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Zustand уже управляет состоянием sidebar. Сейчас sidebar{' '}
          <strong>{isSidebarOpen ? 'открыт' : 'закрыт'}</strong>.
        </Typography>
        <Button onClick={toggleSidebar} sx={{ alignSelf: 'flex-start' }} variant="contained">
          Переключить sidebar
        </Button>

        {healthQuery.isPending ? (
          <Alert severity="info">Проверяю соединение с backend...</Alert>
        ) : null}

        {healthQuery.isError ? (
          <Alert severity="error">
            Не удалось получить статус backend. Проверь, что `apps/backend` запущен на
            `http://localhost:3001`.
          </Alert>
        ) : null}

        {healthQuery.data ? (
          <Alert severity="success">
            Backend health-check: <strong>{healthQuery.data.status}</strong>
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
