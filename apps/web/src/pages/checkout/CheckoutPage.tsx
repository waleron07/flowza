import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useMemo, useState } from "react";
import { useTenantCatalogQuery } from "../../shared/api/catalogApi";
import { useCreateOrderMutation } from "../../shared/api/ordersApi";
import {
  useCartStore,
  getCartLineItems,
  getCartTotal,
  getOrganizationCartItems,
} from "../../shared/store/cart-store";
import { useOrganizationStore } from "../../shared/store/organization-store";
import { AuthRequiredDialog } from "../../features/checkout/ui/AuthRequiredDialog";
import { useAuth } from "../../features/auth/model/useAuth";
import { sx } from "./styles";

export function CheckoutPage({
  requireAuth = false,
}: {
  requireAuth?: boolean;
}) {
  const { user } = useAuth();
  const selectedOrganizationId = useOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const { data, error, isLoading } = useTenantCatalogQuery(
    selectedOrganizationId,
  );
  const selectedOrganization = data?.organization;
  const products = data?.products ?? [];
  const clearCart = useCartStore((state) => state.clearCart);
  const items = useCartStore((state) =>
    getOrganizationCartItems(state.cartsByOrganization, selectedOrganizationId),
  );
  const [dialogOpen, setDialogOpen] = useState(requireAuth);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(
    null,
  );
  const orderMutation = useCreateOrderMutation();
  const lineItems = getCartLineItems(items, products);
  const total = getCartTotal(items, products);
  const orderItems = useMemo(
    () =>
      lineItems.map((item) => ({
        productId: Number(item.productId),
        quantity: item.quantity,
      })),
    [lineItems],
  );

  if (!selectedOrganizationId || isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
        <Typography component="h1" gutterBottom variant="h4">
          Загружаем checkout...
        </Typography>
      </Paper>
    );
  }

  if (error instanceof Error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!selectedOrganization) {
    return (
      <Alert severity="warning">
        Не удалось определить активную организацию.
      </Alert>
    );
  }

  if (lineItems.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
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
    );
  }

  return (
    <>
      <Box sx={sx.root}>
        <Paper elevation={0} sx={sx.card}>
          <Typography component="h1" variant="h3">
            Checkout: {selectedOrganization.name}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
            Checkout выполняется в контексте активной организации. Для гостя
            этот экран остается gate-точкой, а для авторизованного пользователя
            уже создает настоящий заказ в backend без потери корзины
            организации.
          </Typography>

          {createdOrderNumber ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              Заказ {createdOrderNumber} для организации{" "}
              {selectedOrganization.name} создан. Корзина очищена после
              успешного ответа backend.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 3 }}>
              Товары и организация уже берутся из backend. Следующий шаг
              checkout теперь оформляет реальный order API.
            </Alert>
          )}

          {orderMutation.error instanceof Error ? (
            <Alert severity="error" sx={{ mt: 3 }}>
              {orderMutation.error.message}
            </Alert>
          ) : null}

          <TextField
            fullWidth
            label="Адрес доставки"
            multiline
            minRows={3}
            onChange={(event) => {
              setDeliveryAddress(event.target.value);
            }}
            sx={{ mt: 3 }}
            value={deliveryAddress}
          />

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
                  {item.lineTotal} {item.product.currency}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={sx.sidebar}>
          <Typography variant="h5">Сумма заказа</Typography>
          <Typography sx={{ mt: 2, mb: 3, fontWeight: 700 }} variant="h4">
            {total} {lineItems[0]?.product.currency ?? "RUB"}
          </Typography>

          <Stack spacing={2}>
            <Button
              disabled={
                requireAuth ||
                !user ||
                !deliveryAddress.trim() ||
                orderMutation.isPending
              }
              onClick={async () => {
                const order = await orderMutation.mutateAsync({
                  tenantId: selectedOrganization.tenantId,
                  deliveryAddress: deliveryAddress.trim(),
                  paymentMethod: "CASH",
                  items: orderItems,
                });

                setCreatedOrderNumber(order.orderNumber);
                clearCart(selectedOrganizationId);
              }}
              size="large"
              variant="contained"
            >
              {requireAuth
                ? "Сначала войдите в аккаунт"
                : orderMutation.isPending
                  ? "Оформляем заказ..."
                  : "Подтвердить заказ"}
            </Button>
            <Button component={RouterLink} to="/cart" variant="outlined">
              Вернуться в корзину
            </Button>
          </Stack>
        </Paper>
      </Box>

      <AuthRequiredDialog
        onClose={() => {
          setDialogOpen(false);
        }}
        open={dialogOpen}
        redirectTo="/checkout"
      />
    </>
  );
}
