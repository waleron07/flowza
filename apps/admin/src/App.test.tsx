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
    expect(screen.getByLabelText(/телефон/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument()
  })

  it('показывает ошибки валидации при пустой отправке формы', async () => {
    const user = userEvent.setup()

    renderApp()

    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByText(/введите номер телефона/i)).toBeInTheDocument()
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument()
  })

  it('переводит пользователя в защищенную область после успешного login', async () => {
    const user = userEvent.setup()

    mockedLoginRequest.mockResolvedValue({
      accessToken: 'test-token',
      user: {
        id: 1,
        phone: '+79991234567',
        firstName: 'Админ',
        role: 'admin',
        tenantId: 1,
      },
    })

    renderApp()

    await user.type(screen.getByLabelText(/телефон/i), '+79991234567')
    await user.type(screen.getByLabelText(/пароль/i), 'secret12')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByRole('heading', { name: /dashboard flowza/i })).toBeInTheDocument()
    expect(screen.getByText(/вы вошли как/i)).toHaveTextContent('Админ')
    expect(window.localStorage.getItem('flowza.admin.accessToken')).toBe('test-token')
  })
})
