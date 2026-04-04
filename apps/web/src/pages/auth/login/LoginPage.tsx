import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { Form, Formik } from 'formik'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import { useAuth } from '../../../features/auth/model/useAuth'
import { getPostAuthRedirect } from '../../../shared/lib/post-auth-redirect'
import { sx } from './styles'

const loginValidationSchema = Yup.object({
  identifier: Yup.string().required('Введите идентификатор'),
  password: Yup.string().required('Введите пароль'),
})

type LoginFormValues = {
  identifier: string
  password: string
}

const initialValues: LoginFormValues = {
  identifier: '',
  password: '',
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const redirectTo = getPostAuthRedirect(location.search)

  return (
    <Box component="main" sx={sx.root}>
      <Paper elevation={0} sx={sx.paper}>
        <Box sx={sx.header}>
          <Typography component="h1" variant="h4" sx={sx.title}>
            Вход в Flowza
          </Typography>
          <Typography variant="body1" sx={sx.subtitle}>
            Войдите по email, телефону или логину и паролю, чтобы перейти в
            клиентскую часть приложения.
          </Typography>
        </Box>

        <Formik
          initialValues={initialValues}
          validationSchema={loginValidationSchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, helpers) => {
            try {
              helpers.setStatus(undefined)
              await login(values)
              navigate(redirectTo, { replace: true })
            } catch (error) {
              helpers.setStatus({
                message: error instanceof Error ? error.message : 'Не удалось выполнить вход',
              })
            }
          }}
        >
          {({ errors, touched, handleBlur, handleChange, isSubmitting, status, values }) => (
            <Form noValidate>
              <Box sx={sx.form}>
                {status?.message ? <Alert severity="error">{status.message}</Alert> : null}

                <TextField
                  autoComplete="username"
                  autoFocus
                  error={Boolean(touched.identifier && errors.identifier)}
                  fullWidth
                  helperText={touched.identifier && errors.identifier ? errors.identifier : ' '}
                  label="Идентификатор"
                  name="identifier"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="email, +7999..., или логин"
                  value={values.identifier}
                />

                <TextField
                  autoComplete="current-password"
                  error={Boolean(touched.password && errors.password)}
                  fullWidth
                  helperText={touched.password && errors.password ? errors.password : ' '}
                  label="Пароль"
                  name="password"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Введите пароль"
                  type="password"
                  value={values.password}
                />

                <Button
                  disabled={isSubmitting}
                  fullWidth
                  loading={isSubmitting}
                  sx={sx.submitButton}
                  type="submit"
                  variant="contained"
                >
                  Войти
                </Button>

                <Button
                  component={RouterLink}
                  fullWidth
                  sx={sx.secondaryAction}
                  to={`/register?redirectTo=${encodeURIComponent(redirectTo)}`}
                  variant="text"
                >
                  Нет аккаунта? Зарегистрироваться
                </Button>

                <Button
                  component={RouterLink}
                  fullWidth
                  sx={sx.secondaryAction}
                  to={redirectTo}
                  variant="text"
                >
                  Войти как гость
                </Button>
              </Box>
            </Form>
          )}
        </Formik>

        <Typography variant="body2" sx={sx.footerText}>
          Экран подключен к backend auth API: `POST /auth/login` и `GET /auth/me`.
        </Typography>
      </Paper>
    </Box>
  )
}
