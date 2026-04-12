import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../../features/auth/model/useAuth";
import { useOrganizationsQuery } from "../../shared/api/catalogApi";
import { useMyOrdersQuery } from "../../shared/api/ordersApi";
import { useOrganizationStore } from "../../shared/store/organization-store";
import { sx } from "./styles";

export function ProfilePage() {
  const navigate = useNavigate();
  const { deleteAccount, logout, user } = useAuth();
  const selectedOrganizationId = useOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const organizationsQuery = useOrganizationsQuery();
  const ordersQuery = useMyOrdersQuery(Boolean(user));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) {
    return null;
  }

  const organizations = organizationsQuery.data ?? [];
  const organizationNameByTenantId = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [
          organization.tenantId,
          organization.name,
        ]),
      ),
    [organizations],
  );
  const selectedOrganization = organizations.find(
    (organization) => organization.id === selectedOrganizationId,
  );
  const accessibleOrganizations = user.organizationIds
    .map((tenantId) =>
      organizations.find((organization) => organization.tenantId === tenantId),
    )
    .filter((organization) => organization !== undefined);
  const primaryOrganizationName = user.tenantId
    ? (organizationNameByTenantId.get(user.tenantId) ?? `#${user.tenantId}`)
    : "Не назначена";

  return (
    <Box component="main" sx={sx.root}>
      <Box sx={sx.container}>
        <Box sx={sx.header}>
          <Box>
            <Typography component="h1" variant="h3" sx={sx.title}>
              Профиль клиента
            </Typography>
            <Typography variant="body1" sx={sx.subtitle}>
              Профиль уже использует backend-сессию, реальные tenant-данные и
              историю ваших заказов.
            </Typography>
          </Box>

          <Button
            onClick={() => {
              logout();
              navigate("/menu", { replace: true });
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
                Основная организация
              </Typography>
              <Typography variant="h6">{primaryOrganizationName}</Typography>
            </Box>

            <Box sx={sx.infoItem}>
              <Typography variant="body2" sx={sx.infoLabel}>
                Активная организация витрины
              </Typography>
              <Typography variant="h6">
                {selectedOrganization?.name ?? "Не выбрана"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={sx.infoLabel}>
              Доступные организации аккаунта
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              {accessibleOrganizations.length > 0 ? (
                accessibleOrganizations.map((organization) => (
                  <Chip
                    key={organization.id}
                    label={organization.name}
                    variant="outlined"
                  />
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">
                  Для клиентского аккаунта список доступов не назначен отдельно.
                </Typography>
              )}
            </Stack>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h5">Мои заказы</Typography>
            {ordersQuery.isLoading ? (
              <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                Загружаем заказы...
              </Typography>
            ) : null}

            {ordersQuery.error instanceof Error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {ordersQuery.error.message}
              </Alert>
            ) : null}

            {ordersQuery.data && ordersQuery.data.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {ordersQuery.data.map((order) => (
                  <Box key={order.id} sx={sx.infoItem}>
                    <Stack
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="h6">
                          {order.orderNumber}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {order.tenantName} ·{" "}
                          {new Date(order.createdAt).toLocaleString("ru-RU")}
                        </Typography>
                      </Box>
                      <Chip
                        color={order.status === "NEW" ? "primary" : "default"}
                        label={`${order.status} / ${order.paymentStatus}`}
                      />
                    </Stack>

                    <Typography sx={{ mt: 1.5 }} variant="body2">
                      Адрес: {order.deliveryAddress}
                    </Typography>
                    <Typography sx={{ mt: 0.5 }} variant="body2">
                      Состав:{" "}
                      {order.items
                        .map((item) => `${item.productName} x${item.quantity}`)
                        .join(", ")}
                    </Typography>
                    <Typography
                      sx={{ mt: 0.5, fontWeight: 700 }}
                      variant="body1"
                    >
                      Итого: {order.finalAmount} {order.currency}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : null}

            {!ordersQuery.isLoading &&
            !ordersQuery.error &&
            ordersQuery.data?.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">
                Заказов пока нет. После оформления через checkout они появятся
                здесь.
              </Typography>
            ) : null}
          </Box>

          <Box sx={sx.actions}>
            <Button
              color="error"
              disabled={isDeleting}
              loading={isDeleting}
              onClick={async () => {
                const confirmed = window.confirm(
                  "Удалить аккаунт? После этого текущая сессия будет завершена.",
                );

                if (!confirmed) {
                  return;
                }

                try {
                  setErrorMessage(null);
                  setIsDeleting(true);
                  await deleteAccount();
                  navigate("/menu", { replace: true });
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "Не удалось удалить аккаунт",
                  );
                } finally {
                  setIsDeleting(false);
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
  );
}
