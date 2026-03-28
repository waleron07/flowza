import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Form, Formik } from 'formik'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import { useAuth } from '../../../features/auth/model/useAuth'
import { getPostAuthRedirect } from '../../../shared/lib/post-auth-redirect'
import { sx } from './styles'

const registerValidationSchema = Yup.object({
  phone: Yup.string()
    .required('Введите номер телефона')
    .matches(/^\+7\d{10}$/, 'Введите номер телефона РФ в формате +79991234567'),
  firstName: Yup.string().trim().required('Введите имя'),
  password: Yup.string()
    .required('Введите пароль')
    .min(8, 'Пароль должен содержать минимум 8 символов'),
  consentToPrivacyPolicy: Yup.boolean().oneOf(
    [true],
    'Нужно согласиться с политикой конфиденциальности',
  ),
})

type RegisterFormValues = {
  phone: string
  firstName: string
  password: string
  consentToPrivacyPolicy: boolean
}

const initialValues: RegisterFormValues = {
  phone: '',
  firstName: '',
  password: '',
  consentToPrivacyPolicy: false,
}

export function RegisterPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { register } = useAuth()
  const redirectTo = getPostAuthRedirect(location.search)

  return (
    <Box component="main" sx={sx.root}>
      <Paper elevation={0} sx={sx.paper}>
        <Box sx={sx.header}>
          <Typography component="h1" variant="h4" sx={sx.title}>
            Регистрация клиента
          </Typography>
          <Typography variant="body1" sx={sx.subtitle}>
            Создайте клиентский аккаунт по номеру телефона, имени и паролю.
          </Typography>
        </Box>

        <Formik
          initialValues={initialValues}
          validationSchema={registerValidationSchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, helpers) => {
            try {
              helpers.setStatus(undefined)
              await register(values)
              navigate(redirectTo, { replace: true })
            } catch (error) {
              helpers.setStatus({
                message:
                  error instanceof Error ? error.message : 'Не удалось выполнить регистрацию',
              })
            }
          }}
        >
          {({
            errors,
            touched,
            handleBlur,
            handleChange,
            isSubmitting,
            setFieldValue,
            status,
            values,
          }) => (
            <Form noValidate>
              <Box sx={sx.form}>
                {status?.message ? <Alert severity="error">{status.message}</Alert> : null}

                <TextField
                  autoComplete="tel"
                  autoFocus
                  error={Boolean(touched.phone && errors.phone)}
                  fullWidth
                  helperText={touched.phone && errors.phone ? errors.phone : ' '}
                  label="Телефон"
                  name="phone"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="+79991234567"
                  value={values.phone}
                />

                <TextField
                  autoComplete="given-name"
                  error={Boolean(touched.firstName && errors.firstName)}
                  fullWidth
                  helperText={touched.firstName && errors.firstName ? errors.firstName : ' '}
                  label="Имя"
                  name="firstName"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Например, Иван"
                  value={values.firstName}
                />

                <TextField
                  autoComplete="new-password"
                  error={Boolean(touched.password && errors.password)}
                  fullWidth
                  helperText={touched.password && errors.password ? errors.password : ' '}
                  label="Пароль"
                  name="password"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Минимум 8 символов"
                  type="password"
                  value={values.password}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.consentToPrivacyPolicy}
                      onChange={(_, checked) => {
                        void setFieldValue('consentToPrivacyPolicy', checked)
                      }}
                    />
                  }
                  label="Я согласен с политикой конфиденциальности"
                  sx={sx.checkbox}
                />
                {touched.consentToPrivacyPolicy && errors.consentToPrivacyPolicy ? (
                  <Typography color="error" variant="caption">
                    {errors.consentToPrivacyPolicy}
                  </Typography>
                ) : null}

                <Button
                  disabled={isSubmitting}
                  fullWidth
                  loading={isSubmitting}
                  sx={sx.submitButton}
                  type="submit"
                  variant="contained"
                >
                  Зарегистрироваться
                </Button>

                <Button
                  component={RouterLink}
                  fullWidth
                  sx={sx.secondaryAction}
                  to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                  variant="text"
                >
                  Уже есть аккаунт? Войти
                </Button>
              </Box>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  )
}
