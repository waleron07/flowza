import {
  Alert,
  Autocomplete,
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
  useAdminUserCandidatesQuery,
  useCreateCategoryMutation,
  useCreateOrganizationMutation,
  useCreateProductMutation,
  useDeleteOrganizationMutation,
  useManageableOrganizationsQuery,
  useOrganizationManagementQuery,
  useUpdateCategoryMutation,
  useUpdateOrganizationMutation,
  useUpdateProductMutation,
} from "../../features/organizations/api/organizationsApi";
import { userRoles } from "../../shared/types/users";

type OrganizationFormState = {
  adminUserId: string;
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
  workingHoursFrom: string;
  workingHoursTo: string;
  deliveryFee: string;
  minOrderAmount: string;
  subscription: string;
  isActive: boolean;
};

type NewOrganizationFormErrors = Partial<
  Record<
    "adminUserId" | "name" | "slug" | "description" | "subscription",
    string
  >
>;

type OrganizationProfileFormErrors = Partial<
  Record<
    | "name"
    | "slug"
    | "description"
    | "phone"
    | "timezone"
    | "address"
    | "deliveryFee"
    | "minOrderAmount"
    | "subscription"
    | "workingHoursFrom"
    | "workingHoursTo",
    string
  >
>;

type OrganizationLandingFormErrors = Partial<
  Record<
    | "heroTitle"
    | "heroSubtitle"
    | "heroDescription"
    | "heroImageUrl"
    | "seoTitle"
    | "seoDescription",
    string
  >
>;

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
  adminUserId: "",
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
  timezone: "Europe/Moscow",
  workingHoursFrom: "",
  workingHoursTo: "",
  deliveryFee: "",
  minOrderAmount: "",
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

function parseWorkingHoursRange(value: unknown) {
  if (!value) {
    return { from: "", to: "" };
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return { from: "", to: "" };
    }

    try {
      return parseWorkingHoursRange(JSON.parse(trimmedValue) as unknown);
    } catch {
      const match = trimmedValue.match(/(\d{2}:\d{2})\D+(\d{2}:\d{2})/);
      return { from: match?.[1] ?? "", to: match?.[2] ?? "" };
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return { from: "", to: "" };
  }

  const workingHours = value as Record<string, unknown>;
  const from = typeof workingHours.from === "string" ? workingHours.from : "";
  const to = typeof workingHours.to === "string" ? workingHours.to : "";

  if (from || to) {
    return { from, to };
  }

  const firstRangeValue = Object.values(workingHours).find(
    (item): item is string => typeof item === "string",
  );
  const match = firstRangeValue?.match(/(\d{2}:\d{2})\D+(\d{2}:\d{2})/);

  return { from: match?.[1] ?? "", to: match?.[2] ?? "" };
}

function formatPreviewWorkingHours(from: string, to: string) {
  if (from && to) {
    return `с ${from} до ${to}`;
  }

  if (from) {
    return `с ${from}`;
  }

  if (to) {
    return `до ${to}`;
  }

  return "";
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не удалось прочитать изображение"));
    });
    reader.addEventListener("error", () => {
      reject(new Error("Не удалось прочитать изображение"));
    });
    reader.readAsDataURL(file);
  });
}

const russianTimezones = [
  { value: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Europe/Kirov", label: "Киров (UTC+3)" },
  { value: "Europe/Samara", label: "Самара (UTC+4)" },
  { value: "Europe/Astrakhan", label: "Астрахань (UTC+4)" },
  { value: "Europe/Saratov", label: "Саратов (UTC+4)" },
  { value: "Europe/Ulyanovsk", label: "Ульяновск (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { value: "Asia/Omsk", label: "Омск (UTC+6)" },
  { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { value: "Asia/Barnaul", label: "Барнаул (UTC+7)" },
  { value: "Asia/Tomsk", label: "Томск (UTC+7)" },
  { value: "Asia/Novokuznetsk", label: "Новокузнецк (UTC+7)" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { value: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { value: "Asia/Chita", label: "Чита (UTC+9)" },
  { value: "Asia/Yakutsk", label: "Якутск (UTC+9)" },
  { value: "Asia/Khandyga", label: "Хандыга (UTC+9)" },
  { value: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
  { value: "Asia/Ust-Nera", label: "Усть-Нера (UTC+10)" },
  { value: "Asia/Magadan", label: "Магадан (UTC+11)" },
  { value: "Asia/Sakhalin", label: "Сахалин (UTC+11)" },
  { value: "Asia/Srednekolymsk", label: "Среднеколымск (UTC+11)" },
  { value: "Asia/Kamchatka", label: "Камчатка (UTC+12)" },
  { value: "Asia/Anadyr", label: "Анадырь (UTC+12)" },
];

const previewFallbackImage =
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugHelperText = "Только латиница в нижнем регистре, цифры и дефисы";
const dadataAddressToken = String(
  import.meta.env.VITE_DADATA_TOKEN ?? "",
).trim();
const dadataAddressSuggestUrl =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";

type DadataAddressResponse = {
  suggestions?: Array<{ value?: string }>;
};

export function OrganizationsPage() {
  const { user } = useAuth();
  const organizationsQuery = useManageableOrganizationsQuery();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const managementQuery = useOrganizationManagementQuery(selectedTenantId);
  const [organizationForm, setOrganizationForm] =
    useState<OrganizationFormState>(emptyOrganizationForm);
  const [newOrganizationForm, setNewOrganizationForm] =
    useState<OrganizationFormState>(emptyOrganizationForm);
  const [newOrganizationFormErrors, setNewOrganizationFormErrors] =
    useState<NewOrganizationFormErrors>({});
  const [organizationProfileFormErrors, setOrganizationProfileFormErrors] =
    useState<OrganizationProfileFormErrors>({});
  const [organizationLandingFormErrors, setOrganizationLandingFormErrors] =
    useState<OrganizationLandingFormErrors>({});
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
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const canCreateOrganization = user?.role === userRoles.superAdmin;
  const canEditOrganization =
    user?.role === userRoles.superAdmin || user?.role === userRoles.admin;
  const adminCandidatesQuery = useAdminUserCandidatesQuery(
    canCreateOrganization,
  );

  const createOrganizationMutation = useCreateOrganizationMutation();
  const updateOrganizationMutation =
    useUpdateOrganizationMutation(selectedTenantId);
  const deleteOrganizationMutation = useDeleteOrganizationMutation();
  const createCategoryMutation = useCreateCategoryMutation(selectedTenantId);
  const updateCategoryMutation = useUpdateCategoryMutation(selectedTenantId);
  const createProductMutation = useCreateProductMutation(selectedTenantId);
  const updateProductMutation = useUpdateProductMutation(selectedTenantId);

  useEffect(() => {
    if (!organizationsQuery.data?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTenantId(null);
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
    const workingHoursRange = parseWorkingHoursRange(tenant.workingHours);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrganizationForm({
      adminUserId: "",
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
      workingHoursFrom: workingHoursRange.from,
      workingHoursTo: workingHoursRange.to,
      deliveryFee: String(tenant.deliveryFee),
      minOrderAmount: String(tenant.minOrderAmount),
      subscription: tenant.subscription ? tenant.subscription.slice(0, 10) : "",
      isActive: tenant.isActive,
    });
    setCategoryForm(emptyCategoryForm);
    setProductForm(emptyProductForm);
  }, [managementQuery.data]);

  useEffect(() => {
    const query = organizationForm.address.trim();

    if (!dadataAddressToken || query.length < 3) {
      setAddressOptions([]);
      setIsAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsAddressLoading(true);

      try {
        const response = await fetch(dadataAddressSuggestUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            Accept: "application/json",
            Authorization: `Token ${dadataAddressToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, count: 8 }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setAddressOptions([]);
          return;
        }

        const data = (await response.json()) as DadataAddressResponse;
        setAddressOptions(
          (data.suggestions ?? [])
            .map((suggestion) => suggestion.value)
            .filter((value): value is string => Boolean(value)),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setAddressOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [organizationForm.address]);

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

  const previewCategories = categories.slice(0, 3);
  const previewProducts = products.slice(0, 3);
  const previewTitle =
    organizationForm.heroTitle || organizationForm.name || "Организация";
  const previewSubtitle =
    organizationForm.heroSubtitle &&
    organizationForm.heroSubtitle.trim().toLowerCase() !==
      previewTitle.trim().toLowerCase()
      ? organizationForm.heroSubtitle
      : "";
  const previewDeliveryFee = organizationForm.deliveryFee.trim();
  const previewMinOrderAmount = organizationForm.minOrderAmount.trim();
  const previewProfileItems = [
    { label: "Телефон", value: organizationForm.phone },
    { label: "Адрес", value: organizationForm.address },
    {
      label: "Рабочие часы",
      value: formatPreviewWorkingHours(
        organizationForm.workingHoursFrom,
        organizationForm.workingHoursTo,
      ),
    },
  ].filter((item) => item.value.trim().length > 0);

  const validateNewOrganizationForm = () => {
    const errors: NewOrganizationFormErrors = {};

    if (!newOrganizationForm.name.trim()) {
      errors.name = "Укажите название организации";
    }
    if (!newOrganizationForm.slug.trim()) {
      errors.slug = "Укажите идентификатор в адресе";
    } else if (!slugPattern.test(newOrganizationForm.slug.trim())) {
      errors.slug = slugHelperText;
    }
    if (!newOrganizationForm.adminUserId) {
      errors.adminUserId = "Выберите администратора организации";
    }
    if (!newOrganizationForm.description.trim()) {
      errors.description = "Укажите описание организации";
    }
    if (!newOrganizationForm.subscription) {
      errors.subscription = "Укажите дату окончания подписки";
    }

    setNewOrganizationFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOrganizationProfileForm = () => {
    const errors: OrganizationProfileFormErrors = {};

    if (!organizationForm.name.trim()) {
      errors.name = "Укажите название организации";
    }
    if (!organizationForm.slug.trim()) {
      errors.slug = "Укажите идентификатор в адресе";
    } else if (!slugPattern.test(organizationForm.slug.trim())) {
      errors.slug = slugHelperText;
    }
    if (!organizationForm.description.trim()) {
      errors.description = "Укажите описание организации";
    }
    if (!organizationForm.phone.trim()) {
      errors.phone = "Укажите телефон";
    }
    if (!organizationForm.timezone.trim()) {
      errors.timezone = "Укажите часовой пояс";
    }
    if (!organizationForm.address.trim()) {
      errors.address = "Укажите адрес";
    }
    if (!organizationForm.subscription) {
      errors.subscription = "Укажите дату окончания подписки";
    }
    if (!organizationForm.workingHoursFrom) {
      errors.workingHoursFrom = "Укажите начало рабочего дня";
    }
    if (!organizationForm.workingHoursTo) {
      errors.workingHoursTo = "Укажите окончание рабочего дня";
    }

    setOrganizationProfileFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOrganizationLandingForm = () => {
    const errors: OrganizationLandingFormErrors = {};

    if (!organizationForm.heroTitle.trim()) {
      errors.heroTitle = "Укажите заголовок главного экрана";
    }
    if (!organizationForm.heroSubtitle.trim()) {
      errors.heroSubtitle = "Укажите подзаголовок главного экрана";
    }
    if (!organizationForm.heroDescription.trim()) {
      errors.heroDescription = "Укажите описание главного экрана";
    }
    if (!organizationForm.heroImageUrl.trim()) {
      errors.heroImageUrl = "Укажите изображение главного экрана";
    }
    if (!organizationForm.seoTitle.trim()) {
      errors.seoTitle = "Укажите заголовок для поиска";
    }
    if (!organizationForm.seoDescription.trim()) {
      errors.seoDescription = "Укажите описание для поиска";
    }

    setOrganizationLandingFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
            disabled={!organizationsQuery.data?.length}
            fullWidth
            label="Активная организация для редактирования"
            onChange={(event) => {
              setSelectedTenantId(
                event.target.value ? Number(event.target.value) : null,
              );
            }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) {
                  return "";
                }

                const organization = (organizationsQuery.data ?? []).find(
                  (item) => item.id === Number(value),
                );

                return organization
                  ? `${organization.name} (${organization.slug})`
                  : "";
              },
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
            {adminCandidatesQuery.error instanceof Error ? (
              <Alert severity="error">{adminCandidatesQuery.error.message}</Alert>
            ) : null}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                error={Boolean(newOrganizationFormErrors.name)}
                fullWidth
                helperText={newOrganizationFormErrors.name}
                label="Название"
                onChange={(event) => {
                  setNewOrganizationFormErrors((current) => ({
                    ...current,
                    name: undefined,
                  }));
                  setNewOrganizationForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                }}
                required
                value={newOrganizationForm.name}
              />
              <TextField
                error={Boolean(newOrganizationFormErrors.slug)}
                fullWidth
                helperText={newOrganizationFormErrors.slug ?? slugHelperText}
                label="Идентификатор в адресе"
                onChange={(event) => {
                  setNewOrganizationFormErrors((current) => ({
                    ...current,
                    slug: undefined,
                  }));
                  setNewOrganizationForm((current) => ({
                    ...current,
                    slug: event.target.value.trim().toLowerCase(),
                  }));
                }}
                required
                value={newOrganizationForm.slug}
              />
            </Stack>
            <TextField
              error={Boolean(newOrganizationFormErrors.adminUserId)}
              fullWidth
              helperText={
                newOrganizationFormErrors.adminUserId ??
                "Выберите существующего пользователя с ролью admin"
              }
              label="Администратор организации"
              onChange={(event) => {
                setNewOrganizationFormErrors((current) => ({
                  ...current,
                  adminUserId: undefined,
                }));
                setNewOrganizationForm((current) => ({
                  ...current,
                  adminUserId: event.target.value,
                }));
              }}
              required
              select
              value={newOrganizationForm.adminUserId}
            >
              {(adminCandidatesQuery.data ?? []).map((adminUser) => (
                <MenuItem key={adminUser.id} value={String(adminUser.id)}>
                  {adminUser.login} ({adminUser.email}, {adminUser.phone})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              error={Boolean(newOrganizationFormErrors.description)}
              fullWidth
              helperText={newOrganizationFormErrors.description}
              label="Описание"
              multiline
              minRows={2}
              onChange={(event) => {
                setNewOrganizationFormErrors((current) => ({
                  ...current,
                  description: undefined,
                }));
                setNewOrganizationForm((current) => ({
                  ...current,
                  description: event.target.value,
                }));
              }}
              required
              value={newOrganizationForm.description}
            />
            <TextField
              error={Boolean(newOrganizationFormErrors.subscription)}
              fullWidth
              helperText={newOrganizationFormErrors.subscription}
              label="Дата окончания подписки"
              onChange={(event) => {
                setNewOrganizationFormErrors((current) => ({
                  ...current,
                  subscription: undefined,
                }));
                setNewOrganizationForm((current) => ({
                  ...current,
                  subscription: event.target.value,
                }));
              }}
              required
              type="date"
              value={newOrganizationForm.subscription}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              disabled={createOrganizationMutation.isPending}
              onClick={async () => {
                try {
                  setOrganizationError(null);
                  setOrganizationSuccess(null);
                  if (!validateNewOrganizationForm()) {
                    setOrganizationError("Заполните обязательные поля");
                    return;
                  }
                  const adminUserId = Number(newOrganizationForm.adminUserId);

                  const created = await createOrganizationMutation.mutateAsync({
                    adminUserId,
                    name: newOrganizationForm.name.trim(),
                    slug: newOrganizationForm.slug.trim(),
                    description: newOrganizationForm.description.trim(),
                    subscription: newOrganizationForm.subscription,
                  });
                  setOrganizationSuccess(`Организация ${created.name} создана`);
                  setNewOrganizationForm(emptyOrganizationForm);
                  setNewOrganizationFormErrors({});
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
            sx={{
              p: 3,
              borderRadius: 4,
              overflow: "hidden",
              color: "common.white",
              bgcolor: "#0f172a",
              "& .MuiTypography-root": {
                color: "common.white",
              },
              "& .MuiChip-root": {
                color: "common.white",
                bgcolor: "rgba(255,255,255,0.12)",
                borderColor: "rgba(255,255,255,0.4)",
              },
            }}
          >
            <Stack spacing={2.5}>
              <Typography variant="h5" fontWeight={700}>
                Предпросмотр витрины
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
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <Box
                  component="img"
                  src={
                    organizationForm.heroImageUrl ||
                    previewProducts[0]?.imageUrl ||
                    previewFallbackImage
                  }
                  alt={previewTitle}
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
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  {previewSubtitle ? (
                    <Typography sx={{ opacity: 0.82 }} variant="overline">
                      {previewSubtitle}
                    </Typography>
                  ) : null}
                  <Typography variant="h3">
                    {previewTitle}
                  </Typography>
                  <Typography
                    sx={{ maxWidth: 720, opacity: 0.92, textAlign: "center" }}
                    variant="body1"
                  >
                    {organizationForm.heroDescription ||
                      organizationForm.description ||
                      "Добавьте hero-текст, чтобы показать предложение организации."}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                    {previewDeliveryFee ? (
                      <Chip
                        label={`Доставка ${previewDeliveryFee}`}
                        size="small"
                      />
                    ) : null}
                    {previewMinOrderAmount ? (
                      <Chip
                        label={`Мин. заказ ${previewMinOrderAmount}`}
                        size="small"
                      />
                    ) : null}
                    {organizationForm.address ? (
                      <Chip label={organizationForm.address} size="small" />
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="h6">
                    Информация об организации
                  </Typography>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    flexWrap="wrap"
                    gap={1.5}
                  >
                    {previewProfileItems.map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          minWidth: { xs: "100%", md: 220 },
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        <Typography sx={{ opacity: 0.72 }} variant="caption">
                          {item.label}
                        </Typography>
                        <Typography fontWeight={600} variant="body2">
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Paper>

              <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    flex: 1,
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6">Предпросмотр в поиске</Typography>
                    <Typography fontWeight={600} variant="body1">
                      {organizationForm.seoTitle ||
                        organizationForm.heroTitle ||
                        organizationForm.name}
                    </Typography>
                    <Typography sx={{ opacity: 0.72 }} variant="body2">
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
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    flex: 1,
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
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
                            <Typography sx={{ opacity: 0.72 }} variant="caption">
                              {category.description || "Без описания"}
                            </Typography>
                          </Box>
                        </Stack>
                      ))
                    ) : (
                      <Typography sx={{ opacity: 0.72 }} variant="body2">
                        После создания категорий здесь появится превью блоков
                        меню.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
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
                            bgcolor: "rgba(255,255,255,0.08)",
                            border: "1px solid",
                            borderColor: "rgba(255,255,255,0.16)",
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
                            <Typography sx={{ opacity: 0.72 }} variant="body2">
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
                    <Typography sx={{ opacity: 0.72 }} variant="body2">
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
                  error={Boolean(organizationProfileFormErrors.name)}
                  fullWidth
                  helperText={organizationProfileFormErrors.name}
                  label="Название"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  required
                  value={organizationForm.name}
                />
                <TextField
                  error={Boolean(organizationProfileFormErrors.slug)}
                  fullWidth
                  helperText={organizationProfileFormErrors.slug ?? slugHelperText}
                  label="Идентификатор в адресе"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      slug: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      slug: event.target.value.trim().toLowerCase(),
                    }));
                  }}
                  required
                  value={organizationForm.slug}
                />
              </Stack>

              <TextField
                error={Boolean(organizationProfileFormErrors.description)}
                fullWidth
                helperText={organizationProfileFormErrors.description}
                label="Описание организации"
                multiline
                minRows={2}
                onChange={(event) => {
                  setOrganizationProfileFormErrors((current) => ({
                    ...current,
                    description: undefined,
                  }));
                  setOrganizationForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }));
                }}
                required
                value={organizationForm.description}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  error={Boolean(organizationProfileFormErrors.phone)}
                  fullWidth
                  helperText={organizationProfileFormErrors.phone}
                  label="Телефон"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      phone: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }));
                  }}
                  required
                  value={organizationForm.phone}
                />
                <TextField
                  error={Boolean(organizationProfileFormErrors.timezone)}
                  fullWidth
                  helperText={organizationProfileFormErrors.timezone}
                  label="Часовой пояс"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      timezone: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }));
                  }}
                  required
                  select
                  value={organizationForm.timezone}
                >
                  {russianTimezones.map((timezone) => (
                    <MenuItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Autocomplete
                freeSolo
                loading={isAddressLoading}
                loadingText="Загружаем адреса..."
                noOptionsText={
                  dadataAddressToken
                    ? "Адреса не найдены"
                    : "Добавьте VITE_DADATA_TOKEN для подсказок DaData"
                }
                onChange={(_, value) => {
                  const nextAddress = typeof value === "string" ? value : "";
                  setOrganizationProfileFormErrors((current) => ({
                    ...current,
                    address: undefined,
                  }));
                  setOrganizationForm((current) => ({
                    ...current,
                    address: nextAddress,
                  }));
                }}
                onInputChange={(_, value) => {
                  setOrganizationProfileFormErrors((current) => ({
                    ...current,
                    address: undefined,
                  }));
                  setOrganizationForm((current) => ({
                    ...current,
                    address: value,
                  }));
                }}
                options={addressOptions}
                value={organizationForm.address}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={Boolean(organizationProfileFormErrors.address)}
                    fullWidth
                    helperText={
                      organizationProfileFormErrors.address ??
                      (dadataAddressToken
                        ? "Начните вводить адрес, чтобы увидеть подсказки"
                        : "Для подсказок нужен VITE_DADATA_TOKEN в .env.local")
                    }
                    label="Адрес"
                    required
                  />
                )}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  error={Boolean(organizationProfileFormErrors.deliveryFee)}
                  fullWidth
                  helperText={
                    organizationProfileFormErrors.deliveryFee ?? "Необязательно"
                  }
                  label="Стоимость доставки"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      deliveryFee: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      deliveryFee: event.target.value,
                    }));
                  }}
                  value={organizationForm.deliveryFee}
                />
                <TextField
                  error={Boolean(organizationProfileFormErrors.minOrderAmount)}
                  fullWidth
                  helperText={
                    organizationProfileFormErrors.minOrderAmount ??
                    "Необязательно"
                  }
                  label="Минимальный заказ"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      minOrderAmount: undefined,
                    }));
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
                  error={Boolean(organizationProfileFormErrors.subscription)}
                  fullWidth
                  helperText={organizationProfileFormErrors.subscription}
                  label="Дата окончания подписки"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      subscription: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      subscription: event.target.value,
                    }));
                  }}
                  required
                  type="date"
                  value={organizationForm.subscription}
                  slotProps={{ inputLabel: { shrink: true } }}
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

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  error={Boolean(organizationProfileFormErrors.workingHoursFrom)}
                  fullWidth
                  helperText={organizationProfileFormErrors.workingHoursFrom}
                  label="Рабочие часы от"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      workingHoursFrom: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      workingHoursFrom: event.target.value,
                    }));
                  }}
                  required
                  type="time"
                  value={organizationForm.workingHoursFrom}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  error={Boolean(organizationProfileFormErrors.workingHoursTo)}
                  fullWidth
                  helperText={organizationProfileFormErrors.workingHoursTo}
                  label="Рабочие часы до"
                  onChange={(event) => {
                    setOrganizationProfileFormErrors((current) => ({
                      ...current,
                      workingHoursTo: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      workingHoursTo: event.target.value,
                    }));
                  }}
                  required
                  type="time"
                  value={organizationForm.workingHoursTo}
                  slotProps={{ inputLabel: { shrink: true } }}
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
                    if (!validateOrganizationProfileForm()) {
                      setOrganizationError("Заполните обязательные поля профиля");
                      return;
                    }
                    await updateOrganizationMutation.mutateAsync({
                      name: organizationForm.name.trim(),
                      slug: organizationForm.slug.trim(),
                      description: organizationForm.description.trim(),
                      phone: organizationForm.phone.trim(),
                      address: organizationForm.address.trim(),
                      timezone: organizationForm.timezone.trim(),
                      workingHours: {
                        from: organizationForm.workingHoursFrom,
                        to: organizationForm.workingHoursTo,
                      },
                      deliveryFee:
                        organizationForm.deliveryFee.trim() || undefined,
                      minOrderAmount:
                        organizationForm.minOrderAmount.trim() || undefined,
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
              {user?.role === userRoles.superAdmin ? (
                <Button
                  color="error"
                  disabled={
                    !selectedTenantId || deleteOrganizationMutation.isPending
                  }
                  onClick={async () => {
                    if (!selectedTenantId) {
                      return;
                    }

                    const confirmed = window.confirm(
                      `Удалить организацию "${organizationForm.name}"? Это действие нельзя отменить.`,
                    );
                    if (!confirmed) {
                      return;
                    }

                    try {
                      setOrganizationError(null);
                      setOrganizationSuccess(null);
                      await deleteOrganizationMutation.mutateAsync(
                        selectedTenantId,
                      );
                      setOrganizationSuccess("Организация удалена");
                      setSelectedTenantId(
                        (organizationsQuery.data ?? []).find(
                          (organization) => organization.id !== selectedTenantId,
                        )?.id ?? null,
                      );
                    } catch (error) {
                      setOrganizationError(
                        error instanceof Error
                          ? error.message
                          : "Не удалось удалить организацию",
                      );
                    }
                  }}
                  variant="outlined"
                >
                  Удалить организацию
                </Button>
              ) : null}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>
                Главная страница организации
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  error={Boolean(organizationLandingFormErrors.heroTitle)}
                  fullWidth
                  helperText={organizationLandingFormErrors.heroTitle}
                  label="Заголовок главного экрана"
                  onChange={(event) => {
                    setOrganizationLandingFormErrors((current) => ({
                      ...current,
                      heroTitle: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      heroTitle: event.target.value,
                    }));
                  }}
                  required
                  value={organizationForm.heroTitle}
                />
                <TextField
                  error={Boolean(organizationLandingFormErrors.heroSubtitle)}
                  fullWidth
                  helperText={organizationLandingFormErrors.heroSubtitle}
                  label="Подзаголовок главного экрана"
                  onChange={(event) => {
                    setOrganizationLandingFormErrors((current) => ({
                      ...current,
                      heroSubtitle: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      heroSubtitle: event.target.value,
                    }));
                  }}
                  required
                  value={organizationForm.heroSubtitle}
                />
              </Stack>
              <TextField
                error={Boolean(organizationLandingFormErrors.heroDescription)}
                fullWidth
                helperText={organizationLandingFormErrors.heroDescription}
                label="Описание главного экрана"
                multiline
                minRows={3}
                onChange={(event) => {
                  setOrganizationLandingFormErrors((current) => ({
                    ...current,
                    heroDescription: undefined,
                  }));
                  setOrganizationForm((current) => ({
                    ...current,
                    heroDescription: event.target.value,
                  }));
                }}
                required
                value={organizationForm.heroDescription}
              />
              <Stack spacing={1}>
                <Typography fontWeight={600} variant="body2">
                  Изображение главного экрана
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button component="label" variant="outlined">
                    Выбрать изображение
                    <Box
                      component="input"
                      accept="image/*"
                      aria-label="Изображение главного экрана"
                      hidden
                      onChange={async (event) => {
                        const file = event.target.files?.[0];

                        setOrganizationLandingFormErrors((current) => ({
                          ...current,
                          heroImageUrl: undefined,
                        }));

                        if (!file) {
                          return;
                        }

                        if (!file.type.startsWith("image/")) {
                          setOrganizationLandingFormErrors((current) => ({
                            ...current,
                            heroImageUrl: "Выберите файл изображения",
                          }));
                          return;
                        }

                        try {
                          const heroImageUrl = await readImageFileAsDataUrl(
                            file,
                          );
                          setOrganizationForm((current) => ({
                            ...current,
                            heroImageUrl,
                          }));
                        } catch (error) {
                          setOrganizationLandingFormErrors((current) => ({
                            ...current,
                            heroImageUrl:
                              error instanceof Error
                                ? error.message
                                : "Не удалось прочитать изображение",
                          }));
                        } finally {
                          event.target.value = "";
                        }
                      }}
                      type="file"
                    />
                  </Button>
                  {organizationForm.heroImageUrl ? (
                    <Button
                      color="secondary"
                      onClick={() => {
                        setOrganizationForm((current) => ({
                          ...current,
                          heroImageUrl: "",
                        }));
                      }}
                      variant="outlined"
                    >
                      Удалить изображение
                    </Button>
                  ) : null}
                </Stack>
                {organizationLandingFormErrors.heroImageUrl ? (
                  <Typography color="error" variant="caption">
                    {organizationLandingFormErrors.heroImageUrl}
                  </Typography>
                ) : (
                  <Typography color="text.secondary" variant="caption">
                    Выберите файл изображения, он сразу появится в предпросмотре.
                  </Typography>
                )}
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  error={Boolean(organizationLandingFormErrors.seoTitle)}
                  fullWidth
                  helperText={organizationLandingFormErrors.seoTitle}
                  label="Заголовок для поиска"
                  onChange={(event) => {
                    setOrganizationLandingFormErrors((current) => ({
                      ...current,
                      seoTitle: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      seoTitle: event.target.value,
                    }));
                  }}
                  required
                  value={organizationForm.seoTitle}
                />
                <TextField
                  error={Boolean(organizationLandingFormErrors.seoDescription)}
                  fullWidth
                  helperText={organizationLandingFormErrors.seoDescription}
                  label="Описание для поиска"
                  onChange={(event) => {
                    setOrganizationLandingFormErrors((current) => ({
                      ...current,
                      seoDescription: undefined,
                    }));
                    setOrganizationForm((current) => ({
                      ...current,
                      seoDescription: event.target.value,
                    }));
                  }}
                  required
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
                    if (!validateOrganizationLandingForm()) {
                      setOrganizationError(
                        "Заполните обязательные поля главной страницы",
                      );
                      return;
                    }
                    await updateOrganizationMutation.mutateAsync({
                      heroTitle: organizationForm.heroTitle.trim(),
                      heroSubtitle: organizationForm.heroSubtitle.trim(),
                      heroDescription: organizationForm.heroDescription.trim(),
                      heroImageUrl: organizationForm.heroImageUrl.trim(),
                      seoTitle: organizationForm.seoTitle.trim(),
                      seoDescription: organizationForm.seoDescription.trim(),
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
                placeholder="Название, описание, адрес изображения"
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
                  label="Порядок сортировки"
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
                  label="Адрес изображения"
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
                placeholder="Название, описание, метка, категория"
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
                  label="Адрес изображения"
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
                  label="Текст метки"
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
