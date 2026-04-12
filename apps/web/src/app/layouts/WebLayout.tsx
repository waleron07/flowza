import {
  AppBar,
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import {
  Link as RouterLink,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../features/auth/model/useAuth";
import { useOrganizationsQuery } from "../../shared/api/catalogApi";
import { syncOrganizationSeo } from "../../shared/lib/organization-seo";
import { useOrganizationStore } from "../../shared/store/organization-store";
import {
  getCartItemsCount,
  getOrganizationCartItems,
  useCartStore,
} from "../../shared/store/cart-store";

function NavigationLink({ label, to }: { label: string; to: string }) {
  return (
    <Button
      component={NavLink}
      sx={{
        color: "inherit",
        "&.active": {
          bgcolor: "rgba(255,255,255,0.12)",
        },
      }}
      to={to}
      variant="text"
    >
      {label}
    </Button>
  );
}

export function WebLayout() {
  const navigate = useNavigate();
  const { logout, status, user } = useAuth();
  const {
    data: organizations = [],
    error,
    isLoading,
  } = useOrganizationsQuery();
  const selectedOrganizationId = useOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const setSelectedOrganizationId = useOrganizationStore(
    (state) => state.setSelectedOrganizationId,
  );
  const selectedOrganization =
    organizations.find(
      (organization) => organization.id === selectedOrganizationId,
    ) ??
    organizations[0] ??
    null;
  const cartItemsCount = useCartStore((state) =>
    getCartItemsCount(
      getOrganizationCartItems(
        state.cartsByOrganization,
        selectedOrganizationId,
      ),
    ),
  );

  useEffect(() => {
    if (!organizations.length) {
      return;
    }

    const hasSelectedOrganization = organizations.some(
      (organization) => organization.id === selectedOrganizationId,
    );

    if (!selectedOrganizationId || !hasSelectedOrganization) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId, setSelectedOrganizationId]);

  useEffect(
    () => syncOrganizationSeo(selectedOrganization),
    [selectedOrganization],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1 }}>
          <Typography
            component={RouterLink}
            sx={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}
            to="/menu"
            variant="h6"
          >
            Flowza Web
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <NavigationLink label="Меню" to="/menu" />
            <NavigationLink label="Корзина" to="/cart" />
            {status === "authenticated" ? (
              <NavigationLink label="Профиль" to="/profile" />
            ) : null}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <FormControl
            size="small"
            sx={{
              minWidth: 220,
              bgcolor: "rgba(255,255,255,0.08)",
              borderRadius: 2,
            }}
          >
            <InputLabel
              id="organization-select-label"
              sx={{ color: "rgba(255,255,255,0.72)" }}
            >
              Организация
            </InputLabel>
            <Select
              id="organization-select"
              label="Организация"
              labelId="organization-select-label"
              onChange={(event) => {
                setSelectedOrganizationId(event.target.value);
              }}
              sx={{
                color: "common.white",
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.24)",
                },
                "& .MuiSvgIcon-root": {
                  color: "common.white",
                },
              }}
              value={selectedOrganizationId}
            >
              {organizations.map((organization) => (
                <MenuItem key={organization.id} value={organization.id}>
                  {organization.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Badge badgeContent={cartItemsCount} color="secondary">
            <Button
              color="inherit"
              component={RouterLink}
              to="/cart"
              variant="outlined"
            >
              Корзина
            </Button>
          </Badge>

          {status === "authenticated" ? (
            <>
              <Chip
                color="secondary"
                label={`${user?.login ?? "Клиент"} · ${user?.role ?? "user"}`}
                variant="filled"
              />
              <Button
                color="inherit"
                onClick={() => {
                  logout();
                  navigate("/menu", { replace: true });
                }}
                variant="text"
              >
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Chip color="default" label="Guest" variant="filled" />
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                variant="text"
              >
                Войти
              </Button>
              <Button
                color="inherit"
                component={RouterLink}
                to="/register"
                variant="outlined"
              >
                Регистрация
              </Button>
            </>
          )}
        </Toolbar>
        <Toolbar
          sx={{
            minHeight: "auto",
            py: 1,
            px: { xs: 2, sm: 3 },
            bgcolor: "rgba(0,0,0,0.12)",
          }}
        >
          <Typography color="rgba(255,255,255,0.92)" variant="body2">
            Активная организация: {selectedOrganization?.name ?? "загрузка..."}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography color="rgba(255,255,255,0.72)" variant="body2">
            {selectedOrganization
              ? `${selectedOrganization.description}${selectedOrganization.address ? ` · ${selectedOrganization.address}` : ""}`
              : isLoading
                ? "Загружаем список организаций"
                : "Нет доступных организаций"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {error instanceof Error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : null}
        <Outlet />
      </Container>
    </Box>
  );
}
