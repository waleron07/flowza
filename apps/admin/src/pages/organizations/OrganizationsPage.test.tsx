import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationsPage } from "./OrganizationsPage";
import { appTheme } from "../../app/theme";

const mockedCreateOrganizationMutateAsync = vi.fn();
const mockedUpdateOrganizationMutateAsync = vi.fn();
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
  useCreateOrganizationMutation: () => ({
    isPending: false,
    mutateAsync: mockedCreateOrganizationMutateAsync,
  }),
  useUpdateOrganizationMutation: () => ({
    isPending: false,
    mutateAsync: mockedUpdateOrganizationMutateAsync,
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
    mockedCreateCategoryMutateAsync.mockReset();
    mockedUpdateCategoryMutateAsync.mockReset();
    mockedCreateProductMutateAsync.mockReset();
    mockedUpdateProductMutateAsync.mockReset();
  });

  it("показывает preview витрины с hero, категориями и товарами", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /preview витрины/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/свежая выпечка и кофе/i)).toBeInTheDocument();
    expect(screen.getByText(/завтраки весь день/i)).toBeInTheDocument();
    expect(screen.getAllByText(/десерты/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/наполеон/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/seo preview/i)).toBeInTheDocument();
  });

  it("позволяет superAdmin заполнить форму новой организации", async () => {
    mockedCreateOrganizationMutateAsync.mockResolvedValue({
      id: 10,
      name: "New Place",
    });

    renderPage();

    await act(async () => {
      fireEvent.change(screen.getAllByLabelText(/^название$/i)[0], {
        target: { value: "New Place" },
      });
      fireEvent.change(screen.getAllByLabelText(/^slug$/i)[0], {
        target: { value: "new-place" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /создать организацию/i }),
      );
    });

    expect(mockedCreateOrganizationMutateAsync).toHaveBeenCalledWith({
      name: "New Place",
      slug: "new-place",
      description: undefined,
    });
  });

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
