import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { getMeRequest, loginRequest } from './features/auth/api/authApi'
import { getHealthRequest } from './features/system/api/systemApi'

vi.mock('./features/auth/api/authApi', () => ({
  loginRequest: vi.fn(),
  getMeRequest: vi.fn(),
}))

vi.mock('./features/system/api/systemApi', () => ({
  getHealthRequest: vi.fn(),
}))

const mockedLoginRequest = vi.mocked(loginRequest)
const mockedGetMeRequest = vi.mocked(getMeRequest)
const mockedGetHealthRequest = vi.mocked(getHealthRequest)

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/')
    mockedLoginRequest.mockReset()
    mockedGetMeRequest.mockReset()
    mockedGetHealthRequest.mockReset()
    mockedGetHealthRequest.mockResolvedValue({ status: 'ok' })
  })

  it('отображает login-экран админки', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: /вход в админку flowza/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/идентификатор/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument()
  })

  it('показывает ошибки валидации при пустой отправке формы', async () => {
    const user = userEvent.setup()

    renderApp()

    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByText(/введите идентификатор/i)).toBeInTheDocument()
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument()
  })

  it('переводит пользователя в защищенную область после успешного login', async () => {
    const user = userEvent.setup()

    mockedLoginRequest.mockResolvedValue({
      accessToken: 'test-token',
      user: {
        id: 1,
        phone: '+79991234567',
        login: 'admin_login',
        role: 'admin',
        primaryTenantId: 1,
        organizationIds: [1],
      },
    })

    renderApp()

    await user.type(screen.getByLabelText(/идентификатор/i), '+79991234567')
    await user.type(screen.getByLabelText(/пароль/i), 'secret12')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByRole('heading', { name: /dashboard flowza/i })).toBeInTheDocument()
    expect(screen.getByText(/вы вошли как/i)).toHaveTextContent('admin_login')
    expect(window.localStorage.getItem('flowza.admin.accessToken')).toBe('test-token')
  })

  it('не пускает в админку пользователя с ролью user', async () => {
    const user = userEvent.setup()

    mockedLoginRequest.mockResolvedValue({
      accessToken: 'user-token',
      user: {
        id: 7,
        phone: '+79991230000',
        login: 'client_login',
        role: 'user',
        primaryTenantId: 3,
        organizationIds: [3],
      },
    })

    renderApp()

    await user.type(screen.getByLabelText(/идентификатор/i), '+79991230000')
    await user.type(screen.getByLabelText(/пароль/i), 'secret12')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByText(/роль user не имеет доступа к админке/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /вход в админку flowza/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('flowza.admin.accessToken')).toBeNull()
  })

  it('ограничивает moderator от раздела сотрудников', async () => {
    window.localStorage.setItem('flowza.admin.accessToken', 'restored-token')
    window.history.pushState({}, '', '/staff')
    mockedGetMeRequest.mockResolvedValue({
      id: 10,
      phone: '+79995554433',
      login: 'moderator_login',
      role: 'moderator',
      primaryTenantId: 15,
      organizationIds: [15],
    })

    renderApp()

    expect(await screen.findByRole('heading', { name: /dashboard flowza/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /сотрудники/i })).not.toBeInTheDocument()
    expect(screen.getAllByText('Заказы').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/moderator/i).length).toBeGreaterThan(0)
  })
})
