import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationsPage } from "./OrganizationsPage";
import { appTheme } from "../../app/theme";

const mockedCreateOrganizationMutateAsync = vi.fn();
const mockedUpdateOrganizationMutateAsync = vi.fn();
const mockedDeleteOrganizationMutateAsync = vi.fn();
const mockedCreateCategoryMutateAsync = vi.fn();
const mockedUpdateCategoryMutateAsync = vi.fn();
const mockedCreateProductMutateAsync = vi.fn();
const mockedUpdateProductMutateAsync = vi.fn();
const manageableOrganizations = [
  {
    id: 10,
    name: "Flowza Cafe",
    slug: "flowza-cafe",
    description: "Городское кафе",
    isActive: true,
  },
];
const managementView = {
  tenant: {
    id: 10,
    name: "Flowza Cafe",
    slug: "flowza-cafe",
    description: "Городское кафе",
    heroTitle: "Свежая выпечка и кофе",
    heroSubtitle: "Завтраки весь день",
    heroDescription: "Теплая витрина, десерты и кофе в центре города.",
    heroImageUrl: "https://example.com/hero.jpg",
    seoTitle: "Flowza Cafe",
    seoDescription: "Кафе и десерты",
    isActive: true,
    phone: "+79990000000",
    address: "Москва",
    timezone: "Europe/Moscow",
    workingHours: { mon: "08:00-22:00" },
    deliveryFee: 150,
    minOrderAmount: 900,
    subscription: "2026-12-31T00:00:00.000Z",
  },
  categories: [
    {
      id: 5,
      tenantId: 10,
      name: "Десерты",
      description: "Торты и пирожные",
      imageUrl: "https://example.com/category.jpg",
      sortOrder: 1,
      isActive: true,
    },
  ],
  products: [
    {
      id: 7,
      tenantId: 10,
      categoryId: 5,
      name: "Наполеон",
      description: "Классический торт",
      imageUrl: "https://example.com/product.jpg",
      badgeText: "Хит",
      price: 420,
      currency: "RUB",
      isActive: true,
    },
  ],
};
const adminUserCandidates = [
  {
    id: 15,
    login: "org_admin",
    email: "admin@example.com",
    phone: "+79990000001",
    role: "admin",
  },
];
const confirmMock = vi.fn(() => true);

vi.mock("../../features/auth/model/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      phone: "+79990000000",
      login: "super_admin",
      role: "superAdmin",
      tenantId: 10,
      isActive: true,
    },
  }),
}));

vi.mock("../../features/organizations/api/organizationsApi", () => ({
  useManageableOrganizationsQuery: () => ({
    data: manageableOrganizations,
    error: null,
  }),
  useOrganizationManagementQuery: () => ({
    data: managementView,
    error: null,
  }),
  useAdminUserCandidatesQuery: () => ({
    data: adminUserCandidates,
    error: null,
  }),
  useCreateOrganizationMutation: () => ({
    isPending: false,
    mutateAsync: mockedCreateOrganizationMutateAsync,
  }),
  useUpdateOrganizationMutation: () => ({
    isPending: false,
    mutateAsync: mockedUpdateOrganizationMutateAsync,
  }),
  useDeleteOrganizationMutation: () => ({
    isPending: false,
    mutateAsync: mockedDeleteOrganizationMutateAsync,
  }),
  useCreateCategoryMutation: () => ({
    isPending: false,
    mutateAsync: mockedCreateCategoryMutateAsync,
  }),
  useUpdateCategoryMutation: () => ({
    isPending: false,
    mutateAsync: mockedUpdateCategoryMutateAsync,
  }),
  useCreateProductMutation: () => ({
    isPending: false,
    mutateAsync: mockedCreateProductMutateAsync,
  }),
  useUpdateProductMutation: () => ({
    isPending: false,
    mutateAsync: mockedUpdateProductMutateAsync,
  }),
}));

function renderPage() {
  return render(
    <ThemeProvider theme={appTheme}>
      <QueryClientProvider client={new QueryClient()}>
        <OrganizationsPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("OrganizationsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", confirmMock);
    confirmMock.mockClear();
    mockedCreateOrganizationMutateAsync.mockReset();
    mockedUpdateOrganizationMutateAsync.mockReset();
    mockedDeleteOrganizationMutateAsync.mockReset();
    mockedCreateCategoryMutateAsync.mockReset();
    mockedUpdateCategoryMutateAsync.mockReset();
    mockedCreateProductMutateAsync.mockReset();
    mockedUpdateProductMutateAsync.mockReset();
  });

  it("показывает preview витрины с hero, категориями и товарами", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /предпросмотр витрины/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/свежая выпечка и кофе/i)).toBeInTheDocument();
    expect(screen.getByText(/завтраки весь день/i)).toBeInTheDocument();
    expect(screen.getAllByText(/десерты/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/наполеон/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/предпросмотр в поиске/i)).toBeInTheDocument();
  });

  it("позволяет superAdmin заполнить форму новой организации", async () => {
    const user = userEvent.setup();
    mockedCreateOrganizationMutateAsync.mockResolvedValue({
      id: 10,
      name: "New Place",
    });

    renderPage();

    const createSection = screen
      .getByRole("heading", { name: /создать новую организацию/i })
      .closest(".MuiPaper-root") as HTMLElement;
    const createSectionQueries = within(createSection);
    const nameInput = createSectionQueries.getByLabelText(/^название/i);
    const slugInput =
      createSectionQueries.getByLabelText(/^идентификатор в адресе/i);
    const descriptionInput = createSectionQueries.getByLabelText(/^описание/i);
    const subscriptionInput = createSectionQueries.getByLabelText(
      /^дата окончания подписки/i,
    );

    await user.type(nameInput, "New Place");
    await user.type(slugInput, "new-place");
    await user.click(
      screen.getByRole("combobox", { name: /администратор организации/i }),
    );
    await user.click(await screen.findByRole("option", { name: /org_admin/i }));
    await user.type(descriptionInput, "Описание заведения");
    fireEvent.change(subscriptionInput, { target: { value: "2026-12-31" } });
    await waitFor(() => {
      expect(nameInput).toHaveValue("New Place");
      expect(slugInput).toHaveValue("new-place");
      expect(descriptionInput).toHaveValue("Описание заведения");
      expect(subscriptionInput).toHaveValue("2026-12-31");
    });
    await user.click(
      screen.getByRole("button", { name: /создать организацию/i }),
    );

    await waitFor(() => {
      expect(mockedCreateOrganizationMutateAsync).toHaveBeenCalledWith({
        adminUserId: 15,
        name: "New Place",
        slug: "new-place",
        description: "Описание заведения",
        subscription: "2026-12-31",
      });
    });
  }, 15_000);

  it("позволяет быстро деактивировать категорию и товар", async () => {
    const user = userEvent.setup();
    mockedUpdateCategoryMutateAsync.mockResolvedValue({ success: true });
    mockedUpdateProductMutateAsync.mockResolvedValue({ success: true });

    renderPage();

    await user.click(
      screen.getAllByRole("button", { name: /деактивировать/i })[0],
    );
    expect(confirmMock).toHaveBeenCalledWith(
      'Деактивировать категорию "Десерты"?',
    );
    expect(mockedUpdateCategoryMutateAsync).toHaveBeenCalledWith({
      categoryId: 5,
      payload: {
        tenantId: 10,
        name: "Десерты",
        description: "Торты и пирожные",
        imageUrl: "https://example.com/category.jpg",
        sortOrder: 1,
        isActive: false,
      },
    });

    await user.click(
      screen.getAllByRole("button", { name: /деактивировать/i })[1],
    );
    expect(confirmMock).toHaveBeenCalledWith(
      'Деактивировать товар "Наполеон"?',
    );
    expect(mockedUpdateProductMutateAsync).toHaveBeenCalledWith({
      productId: 7,
      payload: {
        tenantId: 10,
        categoryId: 5,
        name: "Наполеон",
        description: "Классический торт",
        imageUrl: "https://example.com/product.jpg",
        badgeText: "Хит",
        price: 420,
        currency: "RUB",
        isActive: false,
      },
    });
  });

  it("отправляет запрос при сохранении профиля организации", async () => {
    const user = userEvent.setup();
    mockedUpdateOrganizationMutateAsync.mockResolvedValue({ id: 10 });

    renderPage();

    await user.click(
      screen.getByRole("button", { name: /сохранить профиль организации/i }),
    );

    await waitFor(() => {
      expect(mockedUpdateOrganizationMutateAsync).toHaveBeenCalledWith({
        name: "Flowza Cafe",
        slug: "flowza-cafe",
        description: "Городское кафе",
        phone: "+79990000000",
        address: "Москва",
        timezone: "Europe/Moscow",
        workingHours: JSON.stringify({ mon: "08:00-22:00" }, null, 2),
        deliveryFee: 150,
        minOrderAmount: 900,
        subscription: "2026-12-31",
        isActive: true,
      });
    });
  });

  it("позволяет superAdmin удалить организацию после подтверждения", async () => {
    const user = userEvent.setup();
    mockedDeleteOrganizationMutateAsync.mockResolvedValue({ id: 10 });

    renderPage();

    await user.click(
      screen.getByRole("button", { name: /удалить организацию/i }),
    );

    expect(confirmMock).toHaveBeenCalledWith(
      'Удалить организацию "Flowza Cafe"? Это действие нельзя отменить.',
    );
    expect(mockedDeleteOrganizationMutateAsync).toHaveBeenCalledWith(10);
  });

  it("фильтрует категории и товары по поисковому запросу", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/поиск по категориям/i), {
      target: { value: "несуществующая" },
    });
    expect(
      screen.getByText(/по текущему фильтру категории не найдены/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/поиск по категориям/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/поиск по товарам/i), {
      target: { value: "несуществующая" },
    });
    expect(
      screen.getByText(/по текущему фильтру товары не найдены/i),
    ).toBeInTheDocument();
  });
});
