import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { Form, Formik, type FormikHelpers } from 'formik'
import { useState, type RefObject } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  PERSONAL_DATA_AGREEMENT_PATH,
  PERSONAL_DATA_AGREEMENT_VERSION,
} from '../../../../shared/constants/personal-data-agreement'
import { RegisterTurnstile } from '../RegisterTurnstile'
import {
  REGISTER_LOGIN_HELPER_TEXT,
  registerValidationSchema,
} from '../validation/register-form.schema'
import { registerFormInitialValues, type RegisterFormValues } from '../register-form.types'
import { RegisterStepLayout } from './RegisterStepLayout'
import { sx } from '../styles'

const MOCK_CAPTCHA_TOKEN = 'mock-captcha-token'

type RegisterFormStepProps = {
  redirectTo: string
  turnstileRef: RefObject<TurnstileInstance | null>
  turnstileSiteKey: string
  onSubmit: (
    values: RegisterFormValues,
    helpers: FormikHelpers<RegisterFormValues>,
  ) => Promise<void>
}

export function RegisterFormStep({
  redirectTo,
  turnstileRef,
  turnstileSiteKey,
  onSubmit,
}: RegisterFormStepProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <RegisterStepLayout
      subtitle="Создайте аккаунт по логину, email, номеру телефона и паролю."
      title="Регистрация"
    >
      <Formik
        initialValues={registerFormInitialValues}
        validationSchema={registerValidationSchema}
        validateOnBlur
        validateOnChange={false}
        onSubmit={onSubmit}
      >
        {({
          errors,
          touched,
          handleBlur,
          handleChange,
          isSubmitting,
          setFieldTouched,
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
                autoComplete="username"
                error={Boolean(touched.login && errors.login)}
                fullWidth
                helperText={
                  touched.login && errors.login ? errors.login : REGISTER_LOGIN_HELPER_TEXT
                }
                label="Логин"
                name="login"
                onBlur={handleBlur}
                onChange={handleChange}
                placeholder="ivan_01"
                value={values.login}
              />

              <TextField
                autoComplete="email"
                error={Boolean(touched.email && errors.email)}
                fullWidth
                helperText={touched.email && errors.email ? errors.email : ' '}
                label="Email"
                name="email"
                onBlur={handleBlur}
                onChange={handleChange}
                placeholder="name@example.com"
                value={values.email}
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
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                          edge="end"
                          onClick={() => {
                            setShowPassword((prevState) => !prevState)
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
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

              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.consentToPersonalData}
                    onChange={(_, checked) => {
                      void setFieldValue('consentToPersonalData', checked)
                    }}
                  />
                }
                label={
                  <span>
                    Я согласен(на) с{' '}
                    <Link component={RouterLink} to={PERSONAL_DATA_AGREEMENT_PATH}>
                      обработкой персональных данных
                    </Link>{' '}
                    (версия {PERSONAL_DATA_AGREEMENT_VERSION})
                  </span>
                }
                sx={sx.checkbox}
              />
              {touched.consentToPersonalData && errors.consentToPersonalData ? (
                <Typography color="error" variant="caption">
                  {errors.consentToPersonalData}
                </Typography>
              ) : null}

              {turnstileSiteKey ? (
                <RegisterTurnstile
                  setFieldTouched={setFieldTouched}
                  setFieldValue={setFieldValue}
                  siteKey={turnstileSiteKey}
                  turnstileRef={turnstileRef}
                />
              ) : (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(values.captchaToken)}
                      onChange={(_, checked) => {
                        void setFieldValue('captchaToken', checked ? MOCK_CAPTCHA_TOKEN : '')
                      }}
                    />
                  }
                  label="Я не робот (без ключа Turnstile — только для разработки)"
                  sx={sx.checkbox}
                />
              )}
              {touched.captchaToken && errors.captchaToken ? (
                <Typography color="error" variant="caption">
                  {errors.captchaToken}
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
    </RegisterStepLayout>
  )
}
