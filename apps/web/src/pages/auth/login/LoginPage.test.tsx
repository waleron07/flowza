import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { theme } from '../../../app/theme'
import { useAuth } from '../../../features/auth/model/useAuth'

const mockedNavigate = vi.hoisted(() => vi.fn())

vi.mock('../../../features/auth/model/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

const mockedUseAuth = vi.mocked(useAuth)

function renderLoginPage(initialEntry = '/login') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Страница входа', () => {
  beforeEach(() => {
    mockedNavigate.mockReset()
    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      applyAuthSession: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('показывает ошибки валидации при пустой отправке формы', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByText(/введите идентификатор/i)).toBeInTheDocument()
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument()
  })

  it('выполняет вход и возвращает пользователя в сценарий redirectTo', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue(undefined)

    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login,
      register: vi.fn(),
      applyAuthSession: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderLoginPage('/login?redirectTo=/checkout')

    await user.type(screen.getByLabelText(/идентификатор/i), '+79991234567')
    await user.type(screen.getByLabelText(/пароль/i), 'strongpass')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(login).toHaveBeenCalledWith({
      identifier: '+79991234567',
      password: 'strongpass',
    })
    expect(mockedNavigate).toHaveBeenCalledWith('/checkout', { replace: true })
  })

  it('показывает ошибку backend при неуспешном входе', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue(new Error('Неверный пароль'))

    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login,
      register: vi.fn(),
      applyAuthSession: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderLoginPage()

    await user.type(screen.getByLabelText(/идентификатор/i), '+79991234567')
    await user.type(screen.getByLabelText(/пароль/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /войти/i }))

    expect(await screen.findByText(/неверный пароль/i)).toBeInTheDocument()
    expect(mockedNavigate).not.toHaveBeenCalled()
  })
})
