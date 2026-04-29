import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../features/auth/model/useAuth";
import {
  useCreateCategoryMutation,
  useCreateOrganizationMutation,
  useCreateProductMutation,
  useManageableOrganizationsQuery,
  useOrganizationManagementQuery,
  useUpdateCategoryMutation,
  useUpdateOrganizationMutation,
  useUpdateProductMutation,
} from "../../features/organizations/api/organizationsApi";
import { userRoles } from "../../shared/types/users";

type OrganizationFormState = {
  name: string;
  slug: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  phone: string;
  address: string;
  timezone: string;
  workingHours: string;
  deliveryFee: string;
  minOrderAmount: string;
  subscription: string;
  isActive: boolean;
};

type CategoryFormState = {
  id: number | null;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

type ProductFormState = {
  id: number | null;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  badgeText: string;
  price: string;
  currency: string;
  isActive: boolean;
};

const emptyOrganizationForm: OrganizationFormState = {
  name: "",
  slug: "",
  description: "",
  heroTitle: "",
  heroSubtitle: "",
  heroDescription: "",
  heroImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  phone: "",
  address: "",
  timezone: "UTC",
  workingHours: "{}",
  deliveryFee: "0",
  minOrderAmount: "0",
  subscription: "",
  isActive: true,
};

const emptyCategoryForm: CategoryFormState = {
  id: null,
  name: "",
  description: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};

const emptyProductForm: ProductFormState = {
  id: null,
  categoryId: "",
  name: "",
  description: "",
  imageUrl: "",
  badgeText: "",
  price: "",
  currency: "RUB",
  isActive: true,
};

function stringifyWorkingHours(value: Record<string, unknown> | null) {
  return JSON.stringify(value ?? {}, null, 2);
}

const previewFallbackImage =
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";

export function OrganizationsPage() {
  const { user } = useAuth();
  const organizationsQuery = useManageableOrganizationsQuery();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const managementQuery = useOrganizationManagementQuery(selectedTenantId);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(emptyOrganizationForm);
  const [newOrganizationForm, setNewOrganizationForm] =
    useState<OrganizationFormState>(emptyOrganizationForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm);
  const [organizationError, setOrganizationError] = useState<string | null>(
    null,
  );
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [organizationSuccess, setOrganizationSuccess] = useState<string | null>(
    null,
  );
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [productSuccess, setProductSuccess] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const canCreateOrganization = user?.role === userRoles.superAdmin;
  const canEditOrganization =
    user?.role === userRoles.superAdmin || user?.role === userRoles.admin;

  const createOrganizationMutation = useCreateOrganizationMutation();
  const updateOrganizationMutation =
    useUpdateOrganizationMutation(selectedTenantId);
  const createCategoryMutation = useCreateCategoryMutation(selectedTenantId);
  const updateCategoryMutation = useUpdateCategoryMutation(selectedTenantId);
  const createProductMutation = useCreateProductMutation(selectedTenantId);
  const updateProductMutation = useUpdateProductMutation(selectedTenantId);

  useEffect(() => {
    if (!organizationsQuery.data?.length) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTenantId((current) => current ?? organizationsQuery.data[0].id);
  }, [organizationsQuery.data]);

  useEffect(() => {
    if (!managementQuery.data) {
      return;
    }

    const { tenant } = managementQuery.data;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrganizationForm({
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description ?? "",
      heroTitle: tenant.heroTitle ?? "",
      heroSubtitle: tenant.heroSubtitle ?? "",
      heroDescription: tenant.heroDescription ?? "",
      heroImageUrl: tenant.heroImageUrl ?? "",
      seoTitle: tenant.seoTitle ?? "",
      seoDescription: tenant.seoDescription ?? "",
      phone: tenant.phone ?? "",
      address: tenant.address ?? "",
      timezone: tenant.timezone,
      workingHours: stringifyWorkingHours(tenant.workingHours),
      deliveryFee: String(tenant.deliveryFee),
      minOrderAmount: String(tenant.minOrderAmount),
      subscription: tenant.subscription ? tenant.subscription.slice(0, 10) : "",
      isActive: tenant.isActive,
    });
    setCategoryForm(emptyCategoryForm);
    setProductForm(emptyProductForm);
  }, [managementQuery.data]);

  const categories = useMemo(
    () => managementQuery.data?.categories ?? [],
    [managementQuery.data?.categories],
  );
  const products = useMemo(
    () => managementQuery.data?.products ?? [],
    [managementQuery.data?.products],
  );
  const filteredCategories = useMemo(() => {
    const query = categorySearchQuery.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.description ?? "", category.imageUrl ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [categories, categorySearchQuery]);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const filteredProducts = useMemo(() => {
    const query = productSearchQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.description ?? "",
        product.badgeText ?? "",
        categoriesById.get(product.categoryId) ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [categoriesById, productSearchQuery, products]);

  const parseWorkingHours = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      return undefined;
    }

    return JSON.parse(trimmed) as Record<string, unknown>;
  };

  const previewCategories = categories.slice(0, 3);
  const previewProducts = products.slice(0, 3);

  const handleCategoryActiveToggle = async (
    category: (typeof categories)[number],
  ) => {
    if (!selectedTenantId) {
      return;
    }

    const confirmed = window.confirm(
      category.isActive
        ? `Деактивировать категорию "${category.name}"?`
        : `Активировать категорию "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setCategoryError(null);
      setCategorySuccess(null);
      await updateCategoryMutation.mutateAsync({
        categoryId: category.id,
        payload: {
          tenantId: selectedTenantId,
          name: category.name,
          description: category.description ?? undefined,
          imageUrl: category.imageUrl ?? undefined,
          sortOrder: category.sortOrder,
          isActive: !category.isActive,
        },
      });
      setCategorySuccess(
        !category.isActive
          ? "Категория снова активна"
          : "Категория деактивирована",
      );
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить статус категории",
      );
    }
  };

  const handleProductActiveToggle = async (
    product: (typeof products)[number],
  ) => {
    if (!selectedTenantId) {
      return;
    }

    const confirmed = window.confirm(
      product.isActive
        ? `Деактивировать товар "${product.name}"?`
        : `Активировать товар "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setProductError(null);
      setProductSuccess(null);
      await updateProductMutation.mutateAsync({
        productId: product.id,
        payload: {
          tenantId: selectedTenantId,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          badgeText: product.badgeText ?? undefined,
          price: product.price,
          currency: product.currency,
          isActive: !product.isActive,
        },
      });
      setProductSuccess(
        !product.isActive ? "Товар снова активен" : "Товар деактивирован",
      );
    } catch (error) {
      setProductError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить статус товара",
      );
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h4" fontWeight={700}>
          Организации
        </Typography>
        <Typography color="text.secondary" variant="body1">
          В одном разделе собраны профиль организации, главная страница витрины,
          категории и карточки товаров. Схема backend расширена под hero/SEO и
          визуальные поля каталога.
        </Typography>
      </Stack>

      {organizationsQuery.error instanceof Error ? (
        <Alert severity="error">{organizationsQuery.error.message}</Alert>
      ) : null}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
        >
          <TextField
            fullWidth
            label="Активная организация для редактирования"
            onChange={(event) => {
              setSelectedTenantId(Number(event.target.value));
            }}
            select
            value={selectedTenantId ?? ""}
          >
            {(organizationsQuery.data ?? []).map((organization) => (
              <MenuItem key={organization.id} value={organization.id}>
                {organization.name} ({organization.slug})
              </MenuItem>
            ))}
          </TextField>

          {selectedTenantId && organizationsQuery.data ? (
            <Chip
              color={
                organizationsQuery.data.find(
                  (organization) => organization.id === selectedTenantId,
                )?.isActive
                  ? "success"
                  : "default"
              }
              label={
                organizationsQuery.data.find(
                  (organization) => organization.id === selectedTenantId,
                )?.isActive
                  ? "Активна"
                  : "Неактивна"
              }
            />
          ) : null}
        </Stack>
      </Paper>

      {canCreateOrganization ? (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Создать новую организацию
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Название"
                onChange={(event) => {
                  setNewOrganizationForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                value={newOrganizationForm.name}
              />
              <TextField
                fullWidth
                label="Slug"
                onChange={(event) => {
                  setNewOrganizationForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }));
                }}
                value={newOrganizationForm.slug}
              />
            </Stack>
            <TextField
              fullWidth
              label="Описание"
              multiline
              minRows={2}
              onChange={(event) => {
                setNewOrganizationForm((current) => ({
                  ...current,
                  description: event.target.value,
                }));
              }}
              value={newOrganizationForm.description}
            />
            <Button
              disabled={createOrganizationMutation.isPending}
              onClick={async () => {
                try {
                  setOrganizationError(null);
                  setOrganizationSuccess(null);
                  const created = await createOrganizationMutation.mutateAsync({
                    name: newOrganizationForm.name.trim(),
                    slug: newOrganizationForm.slug.trim(),
                    description:
                      newOrganizationForm.description.trim() || undefined,
                  });
                  setOrganizationSuccess(`Организация ${created.name} создана`);
                  setNewOrganizationForm(emptyOrganizationForm);
                  if (typeof created.id === "number") {
                    setSelectedTenantId(created.id);
                  }
                } catch (error) {
                  setOrganizationError(
                    error instanceof Error
                      ? error.message
                      : "Не удалось создать организацию",
                  );
                }
              }}
              variant="contained"
            >
              Создать организацию
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {managementQuery.error instanceof Error ? (
        <Alert severity="error">{managementQuery.error.message}</Alert>
      ) : null}

      {organizationError ? (
        <Alert severity="error">{organizationError}</Alert>
      ) : null}
      {organizationSuccess ? (
        <Alert severity="success">{organizationSuccess}</Alert>
      ) : null}
      {categoryError ? <Alert severity="error">{categoryError}</Alert> : null}
      {categorySuccess ? (
        <Alert severity="success">{categorySuccess}</Alert>
      ) : null}
      {productError ? <Alert severity="error">{productError}</Alert> : null}
      {productSuccess ? (
        <Alert severity="success">{productSuccess}</Alert>
      ) : null}

      {managementQuery.data ? (
        <>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 4, overflow: "hidden" }}
          >
            <Stack spacing={2.5}>
              <Typography variant="h5" fontWeight={700}>
                Preview витрины
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 4,
                  minHeight: 280,
                  color: "common.white",
                  backgroundColor: "grey.900",
                }}
              >
                <Box
                  component="img"
                  src={
                    organizationForm.heroImageUrl ||
                    previewProducts[0]?.imageUrl ||
                    previewFallbackImage
                  }
                  alt={organizationForm.heroTitle || organizationForm.name}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.82) 72%, rgba(15,23,42,0.94) 100%)",
                  }}
                />
                <Stack
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    p: { xs: 3, md: 4 },
                    gap: 1.5,
                  }}
                >
                  <Typography sx={{ opacity: 0.82 }} variant="overline">
                    {organizationForm.heroSubtitle || organizationForm.name}
                  </Typography>
                  <Typography variant="h3">
                    {organizationForm.heroTitle ||
                      `Меню ${organizationForm.name}`}
                  </Typography>
                  <Typography
                    sx={{ maxWidth: 720, opacity: 0.92 }}
                    variant="body1"
                  >
                    {organizationForm.heroDescription ||
                      organizationForm.description ||
                      "Добавьте hero-текст, чтобы показать предложение организации."}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                    <Chip
                      label={`Доставка ${organizationForm.deliveryFee || "0"} RUB`}
                      size="small"
                    />
                    <Chip
                      label={`Мин. заказ ${organizationForm.minOrderAmount || "0"} RUB`}
                      size="small"
                    />
                    {organizationForm.address ? (
                      <Chip label={organizationForm.address} size="small" />
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>

              <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                <Paper
                  elevation={0}
                  sx={{ p: 2.5, borderRadius: 3, flex: 1, bgcolor: "grey.50" }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6">SEO preview</Typography>
                    <Typography color="primary.main" variant="body1">
                      {organizationForm.seoTitle ||
                        organizationForm.heroTitle ||
                        organizationForm.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      /{organizationForm.slug || "organization-slug"}
                    </Typography>
                    <Typography variant="body2">
                      {organizationForm.seoDescription ||
                        organizationForm.description ||
                        "Добавьте SEO-описание для поисковой выдачи."}
                    </Typography>
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{ p: 2.5, borderRadius: 3, flex: 1, bgcolor: "grey.50" }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6">Категории в витрине</Typography>
                    {previewCategories.length > 0 ? (
                      previewCategories.map((category) => (
                        <Stack
                          key={category.id}
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            component="img"
                            src={category.imageUrl || previewFallbackImage}
                            alt={category.name}
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 2,
                              objectFit: "cover",
                            }}
                          />
                          <Box>
                            <Typography fontWeight={600} variant="body2">
                              {category.name}
                            </Typography>
                            <Typography
                              color="text.secondary"
                              variant="caption"
                            >
                              {category.description || "Без описания"}
                            </Typography>
                          </Box>
                        </Stack>
                      ))
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        После создания категорий здесь появится превью блоков
                        меню.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Stack>

              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, bgcolor: "grey.50" }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="h6">Карточки товаров</Typography>
                  {previewProducts.length > 0 ? (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      {previewProducts.map((product) => (
                        <Paper
                          key={product.id}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 3,
                            flex: 1,
                            bgcolor: "common.white",
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box
                            component="img"
                            src={product.imageUrl || previewFallbackImage}
                            alt={product.name}
                            sx={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 2,
                            }}
                          />
                          <Stack spacing={1} sx={{ mt: 1.5 }}>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                              {product.badgeText ? (
                                <Chip
                                  label={product.badgeText}
                                  size="small"
                                  color="secondary"
                                />
                              ) : null}
                              <Chip
                                label={
                                  categoriesById.get(product.categoryId) ??
                                  `Категория #${product.categoryId}`
                                }
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                            <Typography fontWeight={700} variant="body1">
                              {product.name}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              {product.description ||
                                "Добавьте описание карточки товара."}
                            </Typography>
                            <Typography fontWeight={700} variant="body2">
                              {product.price} {product.currency}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      После создания товаров здесь появится превью карточек
                      каталога.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Профиль организации
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Название"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  value={organizationForm.name}
                />
                <TextField
                  fullWidth
                  label="Slug"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                  value={organizationForm.slug}
                />
              </Stack>

              <TextField
                fullWidth
                label="Описание организации"
                multiline
                minRows={2}
                onChange={(event) => {
                  setOrganizationForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                value={organizationForm.description}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Телефон"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }));
                  }}
                  value={organizationForm.phone}
                />
                <TextField
                  fullWidth
                  label="Часовой пояс"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }));
                  }}
                  value={organizationForm.timezone}
                />
              </Stack>

              <TextField
                fullWidth
                label="Адрес"
                onChange={(event) => {
                  setOrganizationForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }));
                }}
                value={organizationForm.address}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Стоимость доставки"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      deliveryFee: event.target.value,
                    }));
                  }}
                  value={organizationForm.deliveryFee}
                />
                <TextField
                  fullWidth
                  label="Минимальный заказ"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      minOrderAmount: event.target.value,
                    }));
                  }}
                  value={organizationForm.minOrderAmount}
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Дата окончания подписки"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      subscription: event.target.value,
                    }));
                  }}
                  type="date"
                  value={organizationForm.subscription}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Статус"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }));
                  }}
                  select
                  value={String(organizationForm.isActive)}
                >
                  <MenuItem value="true">Активна</MenuItem>
                  <MenuItem value="false">Неактивна</MenuItem>
                </TextField>
              </Stack>

              <TextField
                fullWidth
                label="Working hours JSON"
                multiline
                minRows={4}
                onChange={(event) => {
                  setOrganizationForm((current) => ({
                    ...current,
                    workingHours: event.target.value,
                  }));
                }}
                value={organizationForm.workingHours}
              />

              <Button
                disabled={
                  !canEditOrganization || updateOrganizationMutation.isPending
                }
                onClick={async () => {
                  try {
                    setOrganizationError(null);
                    setOrganizationSuccess(null);
                    await updateOrganizationMutation.mutateAsync({
                      name: organizationForm.name.trim(),
                      slug: organizationForm.slug.trim(),
                      description:
                        organizationForm.description.trim() || undefined,
                      phone: organizationForm.phone.trim() || undefined,
                      address: organizationForm.address.trim() || undefined,
                      timezone: organizationForm.timezone.trim() || undefined,
                      workingHours: parseWorkingHours(
                        organizationForm.workingHours,
                      ),
                      deliveryFee: Number(organizationForm.deliveryFee || 0),
                      minOrderAmount: Number(
                        organizationForm.minOrderAmount || 0,
                      ),
                      subscription: organizationForm.subscription || undefined,
                      isActive: organizationForm.isActive,
                    });
                    setOrganizationSuccess("Профиль организации обновлен");
                  } catch (error) {
                    setOrganizationError(
                      error instanceof Error
                        ? error.message
                        : "Не удалось обновить организацию",
                    );
                  }
                }}
                variant="contained"
              >
                Сохранить профиль организации
              </Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Главная страница организации
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Hero title"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      heroTitle: event.target.value,
                    }));
                  }}
                  value={organizationForm.heroTitle}
                />
                <TextField
                  fullWidth
                  label="Hero subtitle"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      heroSubtitle: event.target.value,
                    }));
                  }}
                  value={organizationForm.heroSubtitle}
                />
              </Stack>
              <TextField
                fullWidth
                label="Hero description"
                multiline
                minRows={3}
                onChange={(event) => {
                  setOrganizationForm((current) => ({
                    ...current,
                    heroDescription: event.target.value,
                  }));
                }}
                value={organizationForm.heroDescription}
              />
              <TextField
                fullWidth
                label="Hero image URL"
                onChange={(event) => {
                  setOrganizationForm((current) => ({
                    ...current,
                    heroImageUrl: event.target.value,
                  }));
                }}
                value={organizationForm.heroImageUrl}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="SEO title"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      seoTitle: event.target.value,
                    }));
                  }}
                  value={organizationForm.seoTitle}
                />
                <TextField
                  fullWidth
                  label="SEO description"
                  onChange={(event) => {
                    setOrganizationForm((current) => ({
                      ...current,
                      seoDescription: event.target.value,
                    }));
                  }}
                  value={organizationForm.seoDescription}
                />
              </Stack>

              <Button
                disabled={
                  !canEditOrganization || updateOrganizationMutation.isPending
                }
                onClick={async () => {
                  try {
                    setOrganizationError(null);
                    setOrganizationSuccess(null);
                    await updateOrganizationMutation.mutateAsync({
                      heroTitle: organizationForm.heroTitle.trim() || undefined,
                      heroSubtitle:
                        organizationForm.heroSubtitle.trim() || undefined,
                      heroDescription:
                        organizationForm.heroDescription.trim() || undefined,
                      heroImageUrl:
                        organizationForm.heroImageUrl.trim() || undefined,
                      seoTitle: organizationForm.seoTitle.trim() || undefined,
                      seoDescription:
                        organizationForm.seoDescription.trim() || undefined,
                    });
                    setOrganizationSuccess("Контент главной страницы обновлен");
                  } catch (error) {
                    setOrganizationError(
                      error instanceof Error
                        ? error.message
                        : "Не удалось обновить главную страницу",
                    );
                  }
                }}
                variant="contained"
              >
                Сохранить главную страницу
              </Button>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Категории организации
              </Typography>
              <TextField
                fullWidth
                label="Поиск по категориям"
                onChange={(event) => {
                  setCategorySearchQuery(event.target.value);
                }}
                placeholder="Название, описание, image URL"
                value={categorySearchQuery}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Название категории"
                  onChange={(event) => {
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  value={categoryForm.name}
                />
                <TextField
                  fullWidth
                  label="Sort order"
                  onChange={(event) => {
                    setCategoryForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }));
                  }}
                  value={categoryForm.sortOrder}
                />
              </Stack>
              <TextField
                fullWidth
                label="Описание категории"
                multiline
                minRows={2}
                onChange={(event) => {
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                value={categoryForm.description}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Image URL"
                  onChange={(event) => {
                    setCategoryForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }));
                  }}
                  value={categoryForm.imageUrl}
                />
                <TextField
                  fullWidth
                  label="Статус"
                  onChange={(event) => {
                    setCategoryForm((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }));
                  }}
                  select
                  value={String(categoryForm.isActive)}
                >
                  <MenuItem value="true">Активна</MenuItem>
                  <MenuItem value="false">Неактивна</MenuItem>
                </TextField>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button
                  disabled={
                    createCategoryMutation.isPending ||
                    updateCategoryMutation.isPending
                  }
                  onClick={async () => {
                    if (!selectedTenantId) {
                      return;
                    }

                    try {
                      setCategoryError(null);
                      setCategorySuccess(null);
                      const payload = {
                        tenantId: selectedTenantId,
                        name: categoryForm.name.trim(),
                        description:
                          categoryForm.description.trim() || undefined,
                        imageUrl: categoryForm.imageUrl.trim() || undefined,
                        sortOrder: Number(categoryForm.sortOrder || 0),
                        isActive: categoryForm.isActive,
                      };

                      if (categoryForm.id) {
                        await updateCategoryMutation.mutateAsync({
                          categoryId: categoryForm.id,
                          payload,
                        });
                        setCategorySuccess("Категория обновлена");
                      } else {
                        await createCategoryMutation.mutateAsync(payload);
                        setCategorySuccess("Категория создана");
                      }

                      setCategoryForm(emptyCategoryForm);
                    } catch (error) {
                      setCategoryError(
                        error instanceof Error
                          ? error.message
                          : "Не удалось сохранить категорию",
                      );
                    }
                  }}
                  variant="contained"
                >
                  {categoryForm.id ? "Обновить категорию" : "Создать категорию"}
                </Button>
                <Button
                  onClick={() => {
                    setCategoryForm(emptyCategoryForm);
                  }}
                  variant="outlined"
                >
                  Сбросить
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                {filteredCategories.map((category) => (
                  <Paper
                    key={category.id}
                    elevation={0}
                    sx={{ p: 2, borderRadius: 3, bgcolor: "grey.50" }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="h6">{category.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {category.description || "Без описания"}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                          variant="body2"
                        >
                          sortOrder: {category.sortOrder} ·{" "}
                          {category.imageUrl || "без imageUrl"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={category.isActive ? "Активна" : "Неактивна"}
                          size="small"
                        />
                        <Button
                          color={category.isActive ? "warning" : "success"}
                          onClick={() => {
                            void handleCategoryActiveToggle(category);
                          }}
                          variant="text"
                        >
                          {category.isActive
                            ? "Деактивировать"
                            : "Активировать"}
                        </Button>
                        <Button
                          onClick={() => {
                            setCategoryForm({
                              id: category.id,
                              name: category.name,
                              description: category.description ?? "",
                              imageUrl: category.imageUrl ?? "",
                              sortOrder: String(category.sortOrder),
                              isActive: category.isActive,
                            });
                          }}
                          variant="outlined"
                        >
                          Редактировать
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                {filteredCategories.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    По текущему фильтру категории не найдены.
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Карточки товаров
              </Typography>
              <TextField
                fullWidth
                label="Поиск по товарам"
                onChange={(event) => {
                  setProductSearchQuery(event.target.value);
                }}
                placeholder="Название, описание, badge, категория"
                value={productSearchQuery}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Категория"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }));
                  }}
                  select
                  value={productForm.categoryId}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Название товара"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  value={productForm.name}
                />
              </Stack>
              <TextField
                fullWidth
                label="Описание товара"
                multiline
                minRows={2}
                onChange={(event) => {
                  setProductForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                value={productForm.description}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Цена"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }));
                  }}
                  value={productForm.price}
                />
                <TextField
                  fullWidth
                  label="Валюта"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      currency: event.target.value,
                    }));
                  }}
                  value={productForm.currency}
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Image URL"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }));
                  }}
                  value={productForm.imageUrl}
                />
                <TextField
                  fullWidth
                  label="Badge text"
                  onChange={(event) => {
                    setProductForm((current) => ({
                      ...current,
                      badgeText: event.target.value,
                    }));
                  }}
                  value={productForm.badgeText}
                />
              </Stack>
              <TextField
                fullWidth
                label="Статус"
                onChange={(event) => {
                  setProductForm((current) => ({
                    ...current,
                    isActive: event.target.value === "true",
                  }));
                }}
                select
                value={String(productForm.isActive)}
              >
                <MenuItem value="true">Активен</MenuItem>
                <MenuItem value="false">Неактивен</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <Button
                  disabled={
                    createProductMutation.isPending ||
                    updateProductMutation.isPending
                  }
                  onClick={async () => {
                    if (!selectedTenantId) {
                      return;
                    }

                    try {
                      setProductError(null);
                      setProductSuccess(null);
                      const payload = {
                        tenantId: selectedTenantId,
                        categoryId: Number(productForm.categoryId),
                        name: productForm.name.trim(),
                        description:
                          productForm.description.trim() || undefined,
                        imageUrl: productForm.imageUrl.trim() || undefined,
                        badgeText: productForm.badgeText.trim() || undefined,
                        price: Number(productForm.price),
                        currency: productForm.currency.trim() || "RUB",
                        isActive: productForm.isActive,
                      };

                      if (productForm.id) {
                        await updateProductMutation.mutateAsync({
                          productId: productForm.id,
                          payload,
                        });
                        setProductSuccess("Товар обновлен");
                      } else {
                        await createProductMutation.mutateAsync(payload);
                        setProductSuccess("Товар создан");
                      }

                      setProductForm(emptyProductForm);
                    } catch (error) {
                      setProductError(
                        error instanceof Error
                          ? error.message
                          : "Не удалось сохранить товар",
                      );
                    }
                  }}
                  variant="contained"
                >
                  {productForm.id ? "Обновить товар" : "Создать товар"}
                </Button>
                <Button
                  onClick={() => {
                    setProductForm(emptyProductForm);
                  }}
                  variant="outlined"
                >
                  Сбросить
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                {filteredProducts.map((product) => (
                  <Paper
                    key={product.id}
                    elevation={0}
                    sx={{ p: 2, borderRadius: 3, bgcolor: "grey.50" }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="h6">{product.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {categoriesById.get(product.categoryId) ??
                            `Категория #${product.categoryId}`}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                          variant="body2"
                        >
                          {product.price} {product.currency} ·{" "}
                          {product.badgeText || "без badge"} ·{" "}
                          {product.imageUrl || "без imageUrl"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={product.isActive ? "Активен" : "Неактивен"}
                          size="small"
                        />
                        <Button
                          color={product.isActive ? "warning" : "success"}
                          onClick={() => {
                            void handleProductActiveToggle(product);
                          }}
                          variant="text"
                        >
                          {product.isActive ? "Деактивировать" : "Активировать"}
                        </Button>
                        <Button
                          onClick={() => {
                            setProductForm({
                              id: product.id,
                              categoryId: String(product.categoryId),
                              name: product.name,
                              description: product.description ?? "",
                              imageUrl: product.imageUrl ?? "",
                              badgeText: product.badgeText ?? "",
                              price: String(product.price),
                              currency: product.currency,
                              isActive: product.isActive,
                            });
                          }}
                          variant="outlined"
                        >
                          Редактировать
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
                {filteredProducts.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    По текущему фильтру товары не найдены.
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        </>
      ) : null}
    </Stack>
  );
}
