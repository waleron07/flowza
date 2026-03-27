import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Form, Formik } from 'formik'
import * as Yup from 'yup'
import { useCreateStaffMutation } from '../../features/staff/api/useCreateStaffMutation'
import { useAuth } from '../../features/auth/model/useAuth'
import { userRoles, type CreateStaffUserDto, type UserRole } from '../../shared/types/users'
import { sx } from './styles'

type StaffFormValues = {
  phone: string
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  tenantId: string
}

const initialValues: StaffFormValues = {
  phone: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: userRoles.operator,
  tenantId: '',
}

function getAvailableRoles(currentRole: UserRole | undefined) {
  if (currentRole === userRoles.superAdmin) {
    return [userRoles.admin, userRoles.moderator, userRoles.operator]
  }

  if (currentRole === userRoles.admin) {
    return [userRoles.moderator, userRoles.operator]
  }

  return []
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case userRoles.superAdmin:
      return 'superAdmin'
    case userRoles.admin:
      return 'admin'
    case userRoles.moderator:
      return 'moderator'
    case userRoles.operator:
      return 'operator'
    case userRoles.user:
      return 'user'
  }
}

export function StaffPage() {
  const { user } = useAuth()
  const createStaffMutation = useCreateStaffMutation()
  const isSuperAdmin = user?.role === userRoles.superAdmin
  const availableRoles = getAvailableRoles(user?.role)

  const validationSchema = Yup.object({
    phone: Yup.string()
      .required('Введите номер телефона')
      .matches(/^\+7\d{10}$/, 'Введите номер телефона РФ в формате +79991234567'),
    firstName: Yup.string().required('Введите имя'),
    lastName: Yup.string(),
    email: Yup.string().email('Введите корректный email'),
    password: Yup.string()
      .required('Введите пароль')
      .min(8, 'Пароль должен содержать минимум 8 символов'),
    role: Yup.mixed<UserRole>()
      .oneOf(availableRoles, 'Выберите доступную роль')
      .required('Выберите роль'),
    tenantId: isSuperAdmin
      ? Yup.string()
          .test(
            'tenant-id-format',
            'tenantId должен быть положительным числом',
            (value) => !value || /^\d+$/.test(value),
          )
      : Yup.string(),
  })

  return (
    <Stack sx={sx.root}>
      <Stack sx={sx.header}>
        <Typography component="h1" variant="h4" fontWeight={700}>
          Сотрудники
        </Typography>
        <Typography color="text.secondary" variant="body1">
          Создание staff-пользователей через `POST /users/staff` с role-based логикой
          для `admin` и `superAdmin`.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={sx.formCard}>
        <Formik
          enableReinitialize
          initialValues={{
            ...initialValues,
            role: availableRoles[0] ?? userRoles.operator,
          }}
          validationSchema={validationSchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, helpers) => {
            try {
              helpers.setStatus(undefined)

              const payload: CreateStaffUserDto = {
                phone: values.phone,
                firstName: values.firstName,
                password: values.password,
                role: values.role,
                ...(values.lastName ? { lastName: values.lastName } : {}),
                ...(values.email ? { email: values.email } : {}),
                ...(isSuperAdmin && values.tenantId
                  ? { tenantId: Number(values.tenantId) }
                  : {}),
              }

              const createdUser = await createStaffMutation.mutateAsync(payload)

              helpers.resetForm({
                values: {
                  ...initialValues,
                  role: availableRoles[0] ?? userRoles.operator,
                },
              })
              helpers.setStatus({
                type: 'success',
                message: `Сотрудник ${createdUser.firstName} успешно создан с ролью ${createdUser.role}.`,
              })
            } catch (error) {
              helpers.setStatus({
                type: 'error',
                message:
                  error instanceof Error ? error.message : 'Не удалось создать сотрудника',
              })
            }
          }}
        >
          {({ errors, touched, handleBlur, handleChange, isSubmitting, status, values }) => (
            <Form noValidate>
              <Stack sx={sx.form}>
                {status?.message ? (
                  <Alert severity={status.type === 'success' ? 'success' : 'error'}>
                    {status.message}
                  </Alert>
                ) : null}

                {createStaffMutation.isPending ? (
                  <Alert severity="info">Создаю сотрудника...</Alert>
                ) : null}

                <Stack sx={sx.fieldsGrid}>
                  <TextField
                    autoComplete="tel"
                    error={Boolean(touched.phone && errors.phone)}
                    helperText={touched.phone && errors.phone ? errors.phone : ' '}
                    label="Телефон"
                    name="phone"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="+79991234567"
                    value={values.phone}
                  />

                  <TextField
                    error={Boolean(touched.firstName && errors.firstName)}
                    helperText={touched.firstName && errors.firstName ? errors.firstName : ' '}
                    label="Имя"
                    name="firstName"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.firstName}
                  />

                  <TextField
                    error={Boolean(touched.lastName && errors.lastName)}
                    helperText={touched.lastName && errors.lastName ? errors.lastName : ' '}
                    label="Фамилия"
                    name="lastName"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.lastName}
                  />

                  <TextField
                    error={Boolean(touched.email && errors.email)}
                    helperText={touched.email && errors.email ? errors.email : ' '}
                    label="Email"
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.email}
                  />

                  <TextField
                    error={Boolean(touched.password && errors.password)}
                    helperText={touched.password && errors.password ? errors.password : ' '}
                    label="Пароль"
                    name="password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    type="password"
                    value={values.password}
                  />

                  <TextField
                    error={Boolean(touched.role && errors.role)}
                    helperText={touched.role && errors.role ? errors.role : ' '}
                    label="Роль"
                    name="role"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    select
                    value={values.role}
                  >
                    {availableRoles.map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </MenuItem>
                    ))}
                  </TextField>

                  {isSuperAdmin ? (
                    <TextField
                      error={Boolean(touched.tenantId && errors.tenantId)}
                      helperText={
                        touched.tenantId && errors.tenantId
                          ? errors.tenantId
                          : 'Необязательно. Можно указать tenantId для новой организации.'
                      }
                      label="Tenant ID"
                      name="tenantId"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      value={values.tenantId}
                    />
                  ) : null}
                </Stack>

                <Stack sx={sx.submitRow}>
                  <Button
                    disabled={isSubmitting || createStaffMutation.isPending}
                    loading={isSubmitting || createStaffMutation.isPending}
                    type="submit"
                    variant="contained"
                  >
                    Создать сотрудника
                  </Button>
                </Stack>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>

      <Paper elevation={0} sx={sx.helperCard}>
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>
            Доступные роли для текущего пользователя
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Текущая роль: <strong>{user?.role}</strong>
          </Typography>
          <Typography color="text.secondary" component="div" variant="body2">
            Разрешенные варианты:
            <Box component="ul" sx={sx.roleList}>
              {availableRoles.map((role) => (
                <li key={role}>{getRoleLabel(role)}</li>
              ))}
            </Box>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  )
}
