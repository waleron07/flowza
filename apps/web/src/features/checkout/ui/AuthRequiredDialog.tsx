import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function AuthRequiredDialog({
  onClose,
  open,
  redirectTo,
}: {
  onClose: () => void
  open: boolean
  redirectTo: string
}) {
  const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectTo)}`
  const registerUrl = `/register?redirectTo=${encodeURIComponent(redirectTo)}`

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>Чтобы оформить заказ, нужно авторизоваться</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary" variant="body1">
            Вы можете продолжить как зарегистрированный пользователь. Корзина не очистится
            после входа или регистрации.
          </Typography>
          <Typography color="text.secondary" variant="body2">
            После авторизации вы вернетесь в checkout и сможете завершить заказ.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="text">
          Пока не сейчас
        </Button>
        <Button component={RouterLink} to={loginUrl} variant="outlined">
          Войти
        </Button>
        <Button component={RouterLink} to={registerUrl} variant="contained">
          Зарегистрироваться
        </Button>
      </DialogActions>
    </Dialog>
  )
}
