import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { sx } from './styles'

export function ProfilePage() {
  const navigate = useNavigate()
  const { deleteAccount, logout, user } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!user) {
    return null
  }

  return (
    <Box component="main" sx={sx.root}>
      <Box sx={sx.container}>
        <Box sx={sx.header}>
          <Box>
            <Typography component="h1" variant="h3" sx={sx.title}>
              Профиль клиента
            </Typography>
            <Typography variant="body1" sx={sx.subtitle}>
              Базовая защищенная страница web-приложения. Здесь уже восстановление сессии,
              просмотр профиля и удаление собственного аккаунта работают через backend.
            </Typography>
          </Box>

          <Button
            onClick={() => {
              logout()
              navigate('/menu', { replace: true })
            }}
            variant="outlined"
          >
            Выйти
          </Button>
        </Box>

        <Paper elevation={0} sx={sx.card}>
          {errorMessage ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Box sx={sx.infoGrid}>
            <Box sx={sx.infoItem}>
              <Typography variant="body2" sx={sx.infoLabel}>
                Логин
              </Typography>
              <Typography variant="h6">{user.login}</Typography>
            </Box>

            <Box sx={sx.infoItem}>
              <Typography variant="body2" sx={sx.infoLabel}>
                Телефон
              </Typography>
              <Typography variant="h6">{user.phone}</Typography>
            </Box>

            <Box sx={sx.infoItem}>
              <Typography variant="body2" sx={sx.infoLabel}>
                Роль
              </Typography>
              <Typography variant="h6">{user.role}</Typography>
            </Box>

            <Box sx={sx.infoItem}>
              <Typography variant="body2" sx={sx.infoLabel}>
                Tenant
              </Typography>
              <Typography variant="h6">{user.tenantId ?? 'Не назначен'}</Typography>
            </Box>
          </Box>

          <Box sx={sx.actions}>
            <Button
              color="error"
              disabled={isDeleting}
              loading={isDeleting}
              onClick={async () => {
                const confirmed = window.confirm(
                  'Удалить аккаунт? После этого текущая сессия будет завершена.',
                )

                if (!confirmed) {
                  return
                }

                try {
                  setErrorMessage(null)
                  setIsDeleting(true)
                  await deleteAccount()
                  navigate('/menu', { replace: true })
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : 'Не удалось удалить аккаунт',
                  )
                } finally {
                  setIsDeleting(false)
                }
              }}
              variant="contained"
            >
              Удалить аккаунт
            </Button>

            <Button
              component="a"
              href="http://localhost:3001/health"
              rel="noreferrer"
              target="_blank"
              variant="text"
            >
              Проверить backend `/health`
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
