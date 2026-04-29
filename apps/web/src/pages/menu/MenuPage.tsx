import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo, useState, type CSSProperties } from "react";
import { useTenantCatalogQuery } from "../../shared/api/catalogApi";
import { useAuth } from "../../features/auth/model/useAuth";
import { useCartStore } from "../../shared/store/cart-store";
import { useOrganizationStore } from "../../shared/store/organization-store";
import { sx } from "./styles";

export function MenuPage() {
  const { status } = useAuth();
  const addItem = useCartStore((state) => state.addItem);
  const selectedOrganizationId = useOrganizationStore(
    (state) => state.selectedOrganizationId,
  );
  const { data, error, isLoading } = useTenantCatalogQuery(
    selectedOrganizationId,
  );
  const selectedOrganization = data?.organization;
  const categories = data?.categories ?? [];
  const organizationProducts = useMemo(
    () => data?.products ?? [],
    [data?.products],
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "all") {
      return organizationProducts;
    }

    return organizationProducts.filter(
      (product) => product.categoryId === selectedCategoryId,
    );
  }, [organizationProducts, selectedCategoryId]);

  if (!selectedOrganizationId || isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5">Загружаем каталог организации...</Typography>
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

  return (
    <Box>
      <Paper elevation={0} sx={sx.hero}>
        {selectedOrganization.heroImageUrl ? (
          <img
            alt={selectedOrganization.heroTitle ?? selectedOrganization.name}
            src={selectedOrganization.heroImageUrl}
            style={sx.heroImage as CSSProperties}
          />
        ) : null}
        <Box sx={sx.heroOverlay} />
        <Box sx={sx.heroContent}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1.4, opacity: 0.84 }}
          >
            {selectedOrganization.heroSubtitle ?? selectedOrganization.name}
          </Typography>
          <Typography component="h1" variant="h2">
            {selectedOrganization.heroTitle ??
              `Меню ${selectedOrganization.name}`}
          </Typography>
          <Typography sx={{ maxWidth: 760, opacity: 0.92 }} variant="body1">
            {selectedOrganization.heroDescription ??
              selectedOrganization.description}
          </Typography>
          <Stack direction="row" sx={sx.heroMeta}>
            <Chip
              label={`Доставка ${selectedOrganization.deliveryFee} RUB`}
              variant="filled"
            />
            <Chip
              label={`Мин. заказ ${selectedOrganization.minOrderAmount} RUB`}
              variant="filled"
            />
            {selectedOrganization.address ? (
              <Chip label={selectedOrganization.address} variant="filled" />
            ) : null}
          </Stack>
        </Box>
      </Paper>

      <Box sx={sx.header}>
        <Typography sx={sx.subtitle} variant="body1">
          Это публичная часть приложения в контексте выбранной организации.
          Гость может смотреть меню и собирать корзину без обязательной
          авторизации, но категории, товары и цены зависят от активной
          организации.
        </Typography>

        <Stack direction="row" spacing={1} sx={sx.categories}>
          <Chip
            color={selectedCategoryId === "all" ? "primary" : "default"}
            label="Все"
            onClick={() => {
              setSelectedCategoryId("all");
            }}
          />
          {categories.map((category) => (
            <Chip
              color={selectedCategoryId === category.id ? "primary" : "default"}
              key={category.id}
              label={category.name}
              onClick={() => {
                setSelectedCategoryId(category.id);
              }}
            />
          ))}
          <Chip
            color={status === "authenticated" ? "secondary" : "default"}
            label={
              status === "authenticated" ? "Режим клиента User" : "Режим Guest"
            }
            variant="outlined"
          />
        </Stack>
      </Box>

      {categories.length > 0 ? (
        <Box sx={sx.categoriesGrid}>
          {categories.map((category) => (
            <Paper
              elevation={0}
              key={category.id}
              onClick={() => {
                setSelectedCategoryId(category.id);
              }}
              sx={{
                ...sx.categoryCard,
                outline:
                  selectedCategoryId === category.id
                    ? "2px solid"
                    : "1px solid",
                outlineColor:
                  selectedCategoryId === category.id
                    ? "primary.main"
                    : "divider",
              }}
            >
              <img
                alt={category.name}
                src={category.imageUrl ?? organizationProducts[0]?.image ?? ""}
                style={sx.categoryImage as CSSProperties}
              />
              <Box>
                <Typography variant="h6">{category.name}</Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.75 }}
                  variant="body2"
                >
                  {category.description ?? "Категория без описания"}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : null}

      <Box sx={sx.grid}>
        {filteredProducts.map((product) => (
          <Card elevation={0} key={product.id} sx={sx.card}>
            <img
              alt={product.name}
              src={product.image}
              style={sx.media as CSSProperties}
            />
            <CardContent sx={sx.cardContent}>
              <Box>
                <Box sx={sx.badgeRow}>
                  {product.badgeText ? (
                    <Chip
                      color="secondary"
                      label={product.badgeText}
                      size="small"
                    />
                  ) : null}
                  <Chip
                    label={
                      categories.find(
                        (category) => category.id === product.categoryId,
                      )?.name ?? "Категория"
                    }
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography component="h2" variant="h5">
                  {product.name}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 1 }}
                  variant="body2"
                >
                  {product.description}
                </Typography>
              </Box>

              <Box sx={sx.cardFooter}>
                <Paper
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    bgcolor: "grey.100",
                  }}
                >
                  <Typography fontWeight={700} variant="body1">
                    {product.price} {product.currency}
                  </Typography>
                </Paper>
                <Button
                  onClick={() => {
                    addItem(selectedOrganizationId, product.id);
                  }}
                  variant="contained"
                >
                  В корзину
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
