import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterPage } from './RegisterPage'
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

function renderRegisterPage(initialEntry = '/register') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RegisterPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('Страница регистрации', () => {
  beforeEach(() => {
    mockedNavigate.mockReset()
    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('требует согласие с политикой и обязательные поля', async () => {
    const user = userEvent.setup()

    renderRegisterPage()

    await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }))

    expect(await screen.findByText(/введите номер телефона/i)).toBeInTheDocument()
    expect(await screen.findByText(/введите имя/i)).toBeInTheDocument()
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument()
    expect(
      await screen.findByText(/нужно согласиться с политикой конфиденциальности/i),
    ).toBeInTheDocument()
  })

  it('выполняет регистрацию и сохраняет сценарий redirectTo', async () => {
    const user = userEvent.setup()
    const register = vi.fn().mockResolvedValue(undefined)

    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderRegisterPage('/register?redirectTo=/checkout')

    await user.type(screen.getByLabelText(/телефон/i), '+79991234567')
    await user.type(screen.getByLabelText(/имя/i), 'Иван')
    await user.type(screen.getByLabelText(/пароль/i), 'strongpass')
    await user.click(screen.getByRole('checkbox', { name: /я согласен/i }))
    await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }))

    expect(register).toHaveBeenCalledWith({
      phone: '+79991234567',
      firstName: 'Иван',
      password: 'strongpass',
      consentToPrivacyPolicy: true,
    })
    expect(mockedNavigate).toHaveBeenCalledWith('/checkout', { replace: true })
  })

  it('показывает backend ошибку при неуспешной регистрации', async () => {
    const user = userEvent.setup()
    const register = vi.fn().mockRejectedValue(new Error('Пользователь уже существует'))

    mockedUseAuth.mockReturnValue({
      status: 'guest',
      user: null,
      login: vi.fn(),
      register,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderRegisterPage()

    await user.type(screen.getByLabelText(/телефон/i), '+79991234567')
    await user.type(screen.getByLabelText(/имя/i), 'Иван')
    await user.type(screen.getByLabelText(/пароль/i), 'strongpass')
    await user.click(screen.getByRole('checkbox', { name: /я согласен/i }))
    await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }))

    expect(await screen.findByText(/пользователь уже существует/i)).toBeInTheDocument()
    expect(mockedNavigate).not.toHaveBeenCalled()
  })
})
