import { Box, Paper } from '@mui/material'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { FormikHelpers } from 'formik'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resendEmailCodeRequest, verifyEmailRequest } from '../../../features/auth/api/authApi'
import { useAuth } from '../../../features/auth/model/useAuth'
import { PERSONAL_DATA_AGREEMENT_VERSION } from '../../../shared/constants/personal-data-agreement'
import type { AuthResponseDto } from '../../../shared/types/auth'
import { getPostAuthRedirect } from '../../../shared/lib/post-auth-redirect'
import {
  looksLikeInvalidTurnstileClientToken,
  resolveTurnstileTokenForSubmitAsync,
} from './captcha/register-captcha'
import type { RegisterFormValues, RegisterStep } from './register-form.types'
import { RegisterFormStep } from './steps/RegisterFormStep'
import { RegisterSuccessStep } from './steps/RegisterSuccessStep'
import { RegisterVerifyEmailStep } from './steps/RegisterVerifyEmailStep'
import { verifyCodeSchema } from './validation/register-form.schema'
import { sx } from './styles'

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''

export function RegisterPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { applyAuthSession, register } = useAuth()
  const redirectTo = getPostAuthRedirect(location.search)

  const [step, setStep] = useState<RegisterStep>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [verificationTtlMin, setVerificationTtlMin] = useState(15)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyCodeError, setVerifyCodeError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [pendingAuthResponse, setPendingAuthResponse] = useState<AuthResponseDto | null>(null)
  /** false — письмо не уходило по SMTP (код в логах сервера) */
  const [emailSentViaSmtp, setEmailSentViaSmtp] = useState(true)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  useEffect(() => {
    if (step !== 'verify' || resendSecondsLeft <= 0) {
      return
    }
    const id = window.setInterval(() => {
      setResendSecondsLeft((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [step, resendSecondsLeft])

  useEffect(() => {
    if (step !== 'success' || !pendingAuthResponse) {
      return
    }
    const timer = window.setTimeout(() => {
      applyAuthSession(pendingAuthResponse)
      navigate(redirectTo, { replace: true })
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [applyAuthSession, navigate, pendingAuthResponse, redirectTo, step])

  const handleFormSubmit = useCallback(
    async (values: RegisterFormValues, helpers: FormikHelpers<RegisterFormValues>) => {
      try {
        helpers.setStatus(undefined)
        const captchaToken = await resolveTurnstileTokenForSubmitAsync(
          values.captchaToken,
          turnstileRef,
          Boolean(turnstileSiteKey),
        )

        if (turnstileSiteKey && looksLikeInvalidTurnstileClientToken(captchaToken)) {
          if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_TURNSTILE === '1') {
            console.log('[Turnstile debug] RegisterPage: блокируем отправку — токен не прошёл проверку', {
              siteKeyPresent: Boolean(turnstileSiteKey),
              tokenLength: captchaToken.trim().length,
            })
          }
          helpers.setStatus({
            message:
              'Капча не готова или устарела. Обновите страницу и пройдите проверку ещё раз.',
          })
          turnstileRef.current?.reset()
          return
        }

        const result = await register({
          phone: values.phone,
          login: values.login,
          email: values.email,
          password: values.password,
          consentToPrivacyPolicy: values.consentToPrivacyPolicy,
          consentToPersonalData: values.consentToPersonalData,
          agreementVersion: PERSONAL_DATA_AGREEMENT_VERSION,
          captchaToken,
        })

        if (result.accessToken && result.user) {
          navigate(redirectTo, { replace: true })
          return
        }

        if (result.verificationRequired) {
          setPendingEmail(values.email.trim())
          setVerificationTtlMin(Math.max(1, Math.ceil(result.verificationTtlSec / 60)))
          setResendSecondsLeft(result.resendAvailableInSec)
          setEmailSentViaSmtp(result.emailSentViaSmtp ?? true)
          setStep('verify')
          setVerifyCode('')
          setVerifyCodeError(null)
          return
        }

        helpers.setStatus({
          message: result.message || 'Не удалось завершить регистрацию',
        })
      } catch (error) {
        helpers.setStatus({
          message:
            error instanceof Error ? error.message : 'Не удалось выполнить регистрацию',
        })
      }
    },
    [navigate, redirectTo, register],
  )

  const handleVerifyConfirm = useCallback(async () => {
    setVerifyCodeError(null)
    try {
      await verifyCodeSchema.validate({ code: verifyCode })
    } catch {
      setVerifyCodeError('Введите 6 цифр кода из письма')
      return
    }

    setIsVerifying(true)
    try {
      const authResult = await verifyEmailRequest({
        email: pendingEmail,
        code: verifyCode,
      })
      setPendingAuthResponse(authResult)
      setStep('success')
    } catch (error) {
      setVerifyCodeError(
        error instanceof Error ? error.message : 'Не удалось подтвердить код',
      )
    } finally {
      setIsVerifying(false)
    }
  }, [pendingEmail, verifyCode])

  const handleResendCode = useCallback(async () => {
    setVerifyCodeError(null)
    setIsResending(true)
    try {
      const res = await resendEmailCodeRequest({ email: pendingEmail })
      setResendSecondsLeft(res.resendAvailableInSec)
      if (typeof res.emailSentViaSmtp === 'boolean') {
        setEmailSentViaSmtp(res.emailSentViaSmtp)
      }
    } catch (error) {
      setVerifyCodeError(
        error instanceof Error ? error.message : 'Не удалось отправить код повторно',
      )
    } finally {
      setIsResending(false)
    }
  }, [pendingEmail])

  const handleVerifyCodeChange = useCallback((value: string) => {
    setVerifyCode(value)
    setVerifyCodeError(null)
  }, [])

  return (
    <Box component="main" sx={sx.root}>
      <Paper elevation={0} sx={sx.paper}>
        {step === 'form' ? (
          <RegisterFormStep
            redirectTo={redirectTo}
            turnstileRef={turnstileRef}
            turnstileSiteKey={turnstileSiteKey}
            onSubmit={handleFormSubmit}
          />
        ) : null}

        {step === 'verify' ? (
          <RegisterVerifyEmailStep
            emailSentViaSmtp={emailSentViaSmtp}
            isResending={isResending}
            isVerifying={isVerifying}
            pendingEmail={pendingEmail}
            resendSecondsLeft={resendSecondsLeft}
            verificationTtlMin={verificationTtlMin}
            verifyCode={verifyCode}
            verifyCodeError={verifyCodeError}
            onConfirm={handleVerifyConfirm}
            onResend={handleResendCode}
            onVerifyCodeChange={handleVerifyCodeChange}
          />
        ) : null}

        {step === 'success' ? <RegisterSuccessStep /> : null}
      </Paper>
    </Box>
  )
}
