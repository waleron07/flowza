import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useState } from 'react'
import { getOrganizationById } from '../../shared/data/menu-data'
import {
  useCartStore,
  getCartLineItems,
  getCartTotal,
  getOrganizationCartItems,
} from '../../shared/store/cart-store'
import { useOrganizationStore } from '../../shared/store/organization-store'
import { AuthRequiredDialog } from '../../features/checkout/ui/AuthRequiredDialog'
import { sx } from './styles'

export function CheckoutPage({
  requireAuth = false,
}: {
  requireAuth?: boolean
}) {
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const selectedOrganization = getOrganizationById(selectedOrganizationId)
  const clearCart = useCartStore((state) => state.clearCart)
  const items = useCartStore((state) =>
    getOrganizationCartItems(state.cartsByOrganization, selectedOrganizationId),
  )
  const [dialogOpen, setDialogOpen] = useState(requireAuth)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const lineItems = getCartLineItems(items, selectedOrganizationId)
  const total = getCartTotal(items, selectedOrganizationId)

  if (lineItems.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
        <Typography component="h1" gutterBottom variant="h4">
          Нечего оформлять в организации {selectedOrganization.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }} variant="body1">
          Сначала добавьте товары в корзину.
        </Typography>
        <Button component={RouterLink} to="/menu" variant="contained">
          Перейти в меню
        </Button>
      </Paper>
    )
  }

  return (
    <>
      <Box sx={sx.root}>
        <Paper elevation={0} sx={sx.card}>
          <Typography component="h1" variant="h3">
            Checkout: {selectedOrganization.name}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
            Checkout выполняется в контексте активной организации. Для гостя этот экран служит
            gate-точкой: он увидит модальное окно авторизации, а после входа вернется сюда без
            потери корзины именно этой организации.
          </Typography>

          {orderSuccess ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              Демо-заказ для организации {selectedOrganization.name} подтвержден. Корзина
              очищена только после успешного действия.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 3 }}>
              Пока backend-контрактов заказа еще нет, поэтому экран показывает подготовленный
              клиентский поток и логику сохранения корзины.
            </Alert>
          )}

          <Stack sx={sx.lineItems}>
            {lineItems.map((item) => (
              <Box key={item.productId} sx={sx.lineItem}>
                <Box>
                  <Typography fontWeight={600} variant="body1">
                    {item.product.name}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Количество: {item.quantity}
                  </Typography>
                </Box>
                <Typography fontWeight={700} variant="body1">
                  {item.lineTotal} RUB
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={sx.sidebar}>
          <Typography variant="h5">Сумма заказа</Typography>
          <Typography sx={{ mt: 2, mb: 3, fontWeight: 700 }} variant="h4">
            {total} RUB
          </Typography>

          <Stack spacing={2}>
            <Button
              disabled={requireAuth}
              onClick={() => {
                setOrderSuccess(true)
                clearCart(selectedOrganizationId)
              }}
              size="large"
              variant="contained"
            >
              {requireAuth ? 'Сначала войдите в аккаунт' : 'Подтвердить демо-заказ'}
            </Button>
            <Button component={RouterLink} to="/cart" variant="outlined">
              Вернуться в корзину
            </Button>
          </Stack>
        </Paper>
      </Box>

      <AuthRequiredDialog
        onClose={() => {
          setDialogOpen(false)
        }}
        open={dialogOpen}
        redirectTo="/checkout"
      />
    </>
  )
}
