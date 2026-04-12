import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../features/auth/model/useAuth";
import { AuthRequiredDialog } from "../../features/checkout/ui/AuthRequiredDialog";
import { useTenantCatalogQuery } from "../../shared/api/catalogApi";
import {
  getCartItemsCount,
  getCartLineItems,
  getOrganizationCartItems,
  getCartTotal,
  useCartStore,
} from "../../shared/store/cart-store";
import { useOrganizationStore } from "../../shared/store/organization-store";
import { sx } from "./styles";

export function CartPage() {
  const navigate = useNavigate();
  const { status } = useAuth();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const selectedOrganizationId = useOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const { data, error, isLoading } = useTenantCatalogQuery(
    selectedOrganizationId,
  );
  const selectedOrganization = data?.organization;
  const products = data?.products ?? [];
  const { addItem, cartsByOrganization, decrementItem, removeItem } =
    useCartStore((state) => state);
  const items = getOrganizationCartItems(
    cartsByOrganization,
    selectedOrganizationId,
  );

  const lineItems = getCartLineItems(items, products);
  const total = getCartTotal(items, products);
  const itemsCount = getCartItemsCount(items);

  if (!selectedOrganizationId || isLoading) {
    return (
      <Paper elevation={0} sx={sx.empty}>
        <Typography component="h1" gutterBottom variant="h4">
          Загружаем корзину организации...
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
      <Paper elevation={0} sx={sx.empty}>
        <Typography component="h1" gutterBottom variant="h4">
          Корзина организации {selectedOrganization.name} пуста
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }} variant="body1">
          Добавьте товары из меню выбранной организации. Для каждой организации
          хранится отдельная корзина, поэтому товары и цены не смешиваются.
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
        <Box sx={sx.list}>
          <Typography component="h1" variant="h3">
            Корзина: {selectedOrganization.name}
          </Typography>

          {status === "guest" ? (
            <Alert severity="info">
              Вы собираете корзину как `Guest`. При переходе к оформлению заказа
              появится окно авторизации, а содержимое корзины для организации{" "}
              {selectedOrganization.name} сохранится.
            </Alert>
          ) : null}

          <Alert severity="info">
            Корзина привязана к активной организации. При переключении
            организации вы увидите ее собственную корзину.
          </Alert>
          {status !== "guest" ? (
            <Alert severity="success">
              Вы оформляете заказ как авторизованный клиент в организации{" "}
              {selectedOrganization.name}.
            </Alert>
          ) : null}

          {lineItems.map((item) => (
            <Paper elevation={0} key={item.productId} sx={sx.item}>
              <Box sx={sx.itemHeader}>
                <Box>
                  <Typography variant="h6">{item.product.name}</Typography>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1 }}
                    variant="body2"
                  >
                    {item.product.description}
                  </Typography>
                </Box>

                <Typography fontWeight={700} variant="h6">
                  {item.lineTotal} {item.product.currency}
                </Typography>
              </Box>

              <Stack
                direction="row"
                justifyContent="space-between"
                sx={sx.itemActions}
              >
                <Stack alignItems="center" direction="row" spacing={1}>
                  <IconButton
                    aria-label="Уменьшить количество"
                    onClick={() => {
                      decrementItem(selectedOrganizationId, item.productId);
                    }}
                  >
                    <RemoveRoundedIcon />
                  </IconButton>
                  <Typography minWidth={24} textAlign="center" variant="body1">
                    {item.quantity}
                  </Typography>
                  <IconButton
                    aria-label="Увеличить количество"
                    onClick={() => {
                      addItem(selectedOrganizationId, item.productId);
                    }}
                  >
                    <AddRoundedIcon />
                  </IconButton>
                </Stack>

                <IconButton
                  aria-label="Удалить товар из корзины"
                  color="error"
                  onClick={() => {
                    removeItem(selectedOrganizationId, item.productId);
                  }}
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Box>

        <Paper elevation={0} sx={sx.summary}>
          <Typography variant="h5">Итого</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
            Товаров: {itemsCount}
          </Typography>
          <Typography sx={{ mt: 2, mb: 3, fontWeight: 700 }} variant="h4">
            {total} {lineItems[0]?.product.currency ?? "RUB"}
          </Typography>

          <Stack spacing={2}>
            <Button
              onClick={() => {
                if (status === "authenticated") {
                  navigate("/checkout");
                  return;
                }

                setCheckoutDialogOpen(true);
              }}
              size="large"
              variant="contained"
            >
              Оформить заказ
            </Button>

            <Button component={RouterLink} to="/menu" variant="outlined">
              Продолжить покупки
            </Button>
          </Stack>
        </Paper>
      </Box>

      <AuthRequiredDialog
        onClose={() => {
          setCheckoutDialogOpen(false);
        }}
        open={checkoutDialogOpen}
        redirectTo="/checkout"
      />
    </>
  );
}
