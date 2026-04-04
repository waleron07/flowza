import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/auth-context'
import { createStaffUserRequest } from '../../features/staff/api/staffApi'
import { appTheme } from '../../app/theme'
import { StaffPage } from './StaffPage'

vi.mock('../../features/staff/api/staffApi', () => ({
  createStaffUserRequest: vi.fn(),
}))

const mockedCreateStaffUserRequest = vi.mocked(createStaffUserRequest)

function renderStaffPage(authValue: AuthContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <AuthContext.Provider value={authValue}>
          <StaffPage />
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('StaffPage', () => {
  beforeEach(() => {
    mockedCreateStaffUserRequest.mockReset()
  })

  it('показывает tenantId и роль admin для superAdmin', () => {
    renderStaffPage({
      status: 'authenticated',
      user: {
        id: 1,
        phone: '+79990000001',
        login: 'super_admin',
        role: 'superAdmin',
        tenantId: null,
      },
      login: vi.fn(),
      logout: vi.fn(),
    })

    expect(screen.getByLabelText(/tenant id/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /роль/i })).toHaveTextContent('admin')
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
  })

  it('не показывает tenantId и не дает выбрать admin для admin-пользователя', async () => {
    const user = userEvent.setup()

    renderStaffPage({
      status: 'authenticated',
      user: {
        id: 2,
        phone: '+79990000002',
        login: 'admin_user',
        role: 'admin',
        tenantId: 12,
      },
      login: vi.fn(),
      logout: vi.fn(),
    })

    expect(screen.queryByLabelText(/tenant id/i)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /роль/i })).toHaveTextContent('moderator')

    await user.click(screen.getByRole('combobox', { name: /роль/i }))

    expect(screen.queryByRole('option', { name: 'admin' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'moderator' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'operator' })).toBeInTheDocument()
  })

  it('успешно отправляет форму создания сотрудника', async () => {
    const user = userEvent.setup()

    mockedCreateStaffUserRequest.mockResolvedValue({
      id: 15,
      phone: '+79991234567',
      login: 'ivan_staff',
      email: 'ivan.staff@example.com',
      role: 'moderator',
      tenantId: 22,
      isActive: true,
    })

    renderStaffPage({
      status: 'authenticated',
      user: {
        id: 2,
        phone: '+79990000002',
        login: 'admin_user',
        role: 'admin',
        tenantId: 22,
      },
      login: vi.fn(),
      logout: vi.fn(),
    })

    await user.type(screen.getByLabelText(/телефон/i), '+79991234567')
    await user.type(screen.getByLabelText(/логин/i), 'ivan_staff')
    await user.type(screen.getByLabelText(/email/i), 'ivan.staff@example.com')
    await user.type(screen.getByLabelText(/пароль/i), 'strongpass')
    await user.click(screen.getByRole('button', { name: /создать сотрудника/i }))

    expect(mockedCreateStaffUserRequest).toHaveBeenCalledTimes(1)
    expect(mockedCreateStaffUserRequest.mock.calls[0]?.[0]).toEqual({
      phone: '+79991234567',
      login: 'ivan_staff',
      email: 'ivan.staff@example.com',
      password: 'strongpass',
      role: 'moderator',
    })

    expect(
      await screen.findByText(/сотрудник ivan_staff успешно создан с ролью moderator/i),
    ).toBeInTheDocument()
  })
})
