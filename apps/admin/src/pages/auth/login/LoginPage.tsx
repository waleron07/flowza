import { Visibility, VisibilityOff } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import { useAuth } from '../../../features/auth/model/useAuth'
import { sx } from './styles'

const loginValidationSchema = Yup.object({
  identifier: Yup.string().required('Введите идентификатор'),
  password: Yup.string()
    .required('Введите пароль')
    .min(6, 'Пароль должен содержать минимум 6 символов'),
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
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  return (
    <Box component="main" sx={sx.root}>
      <Paper elevation={0} sx={sx.paper}>
        <Box sx={sx.header}>
          <Typography component="h1" variant="h4" sx={sx.title}>
            Вход в админку Flowza
          </Typography>
          <Typography variant="body1" sx={sx.subtitle}>
            Войдите по email, телефону или логину и паролю, чтобы перейти в
            защищенную часть приложения.
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
              navigate('/', { replace: true })
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
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                            edge="end"
                            onClick={() => setShowPassword((current) => !current)}
                            onMouseDown={(event) => event.preventDefault()}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
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
              </Box>
            </Form>
          )}
        </Formik>

        <Typography variant="body2" sx={sx.footerText}>
          Экран уже подключен к auth-слою и готов к следующему шагу: layout админки,
          navigation и рабочие разделы.
        </Typography>
      </Paper>
    </Box>
  )
}
