import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CartPage } from './CartPage'
import { theme } from '../../app/theme'
import { useAuth } from '../../features/auth/model/useAuth'

const mockedNavigate = vi.hoisted(() => vi.fn())
const mockedCartState = vi.hoisted(() => ({
  cartsByOrganization: {
    'roma-pizza': [{ productId: 'margherita', quantity: 2 }],
  },
  addItem: vi.fn(),
  decrementItem: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
}))

vi.mock('../../features/auth/model/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../shared/store/organization-store', () => ({
  useOrganizationStore: (selector: (state: { selectedOrganizationId: string }) => unknown) =>
    selector({ selectedOrganizationId: 'roma-pizza' }),
}))

vi.mock('../../shared/store/cart-store', () => ({
  useCartStore: (selector: (state: typeof mockedCartState) => unknown) => selector(mockedCartState),
  getOrganizationCartItems: (
    cartsByOrganization: Record<string, { productId: string; quantity: number }[]>,
    organizationId: string,
  ) => cartsByOrganization[organizationId] ?? [],
  getCartLineItems: () => [
    {
      productId: 'margherita',
      quantity: 2,
      product: {
        id: 'margherita',
        name: 'Маргарита',
        description: 'Классическая пицца',
        price: 520,
      },
      lineTotal: 1040,
    },
  ],
  getCartItemsCount: () => 2,
  getCartTotal: () => 1040,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

const mockedUseAuth = vi.mocked(useAuth)

function renderCartPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Страница корзины', () => {
  beforeEach(() => {
    mockedNavigate.mockReset()
    mockedCartState.cartsByOrganization = {
      'roma-pizza': [{ productId: 'margherita', quantity: 2 }],
    }
    mockedCartState.addItem.mockReset()
    mockedCartState.decrementItem.mockReset()
    mockedCartState.removeItem.mockReset()
    mockedCartState.clearCart.mockReset()
  })

  it('открывает модальное окно авторизации для гостя при переходе к оформлению заказа', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderCartPage()

    await user.click(screen.getByRole('button', { name: /оформить заказ/i }))

    expect(
      await screen.findByRole('heading', {
        name: /чтобы оформить заказ, нужно авторизоваться/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /войти/i })).toHaveAttribute(
      'href',
      '/login?redirectTo=%2Fcheckout',
    )
    expect(screen.getByRole('link', { name: /зарегистрироваться/i })).toHaveAttribute(
      'href',
      '/register?redirectTo=%2Fcheckout',
    )
  })

  it('переводит авторизованного пользователя в checkout без модального окна', async () => {
    const user = userEvent.setup()

    mockedUseAuth.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 1,
        phone: '+79991234567',
        firstName: 'Иван',
        role: 'user',
        tenantId: null,
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderCartPage()

    await user.click(screen.getByRole('button', { name: /оформить заказ/i }))

    expect(mockedNavigate).toHaveBeenCalledWith('/checkout')
    expect(
      screen.queryByRole('heading', {
        name: /чтобы оформить заказ, нужно авторизоваться/i,
      }),
    ).not.toBeInTheDocument()
  })
})
