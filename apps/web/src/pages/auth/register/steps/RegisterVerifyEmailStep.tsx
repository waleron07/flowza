import { Alert, Box, Button, TextField } from '@mui/material'
import { RegisterStepLayout } from './RegisterStepLayout'
import { sx } from '../styles'

type RegisterVerifyEmailStepProps = {
  /** false — на сервере не настроен SMTP, код смотрите в логах бэкенда */
  emailSentViaSmtp: boolean
  pendingEmail: string
  verificationTtlMin: number
  verifyCode: string
  onVerifyCodeChange: (value: string) => void
  verifyCodeError: string | null
  isVerifying: boolean
  isResending: boolean
  resendSecondsLeft: number
  onConfirm: () => void
  onResend: () => void
}

export function RegisterVerifyEmailStep({
  emailSentViaSmtp,
  pendingEmail,
  verificationTtlMin,
  verifyCode,
  onVerifyCodeChange,
  verifyCodeError,
  isVerifying,
  isResending,
  resendSecondsLeft,
  onConfirm,
  onResend,
}: RegisterVerifyEmailStepProps) {
  const subtitle = emailSentViaSmtp
    ? `Мы отправили код на ${pendingEmail}. Введите его ниже. Код действует около ${verificationTtlMin} мин.`
    : `Код подтверждения сгенерирован для ${pendingEmail}. Он действует около ${verificationTtlMin} мин.`

  return (
    <RegisterStepLayout subtitle={subtitle} title="Подтвердите email">
      <Box sx={sx.form} component="form" noValidate>
        {!emailSentViaSmtp ? (
          <Alert severity="warning">
            Письмо на почту не отправлялось: на сервере не заданы переменные SMTP (SMTP_HOST, SMTP_PORT,
            SMTP_USER, SMTP_PASS, SMTP_FROM). Код выведен в консоль логов бэкенда — скопируйте его
            оттуда или настройте почту.
          </Alert>
        ) : null}
        {verifyCodeError ? <Alert severity="error">{verifyCodeError}</Alert> : null}

        <TextField
          autoComplete="one-time-code"
          autoFocus
          fullWidth
          inputMode="numeric"
          label="Код из письма"
          name="verifyCode"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
            onVerifyCodeChange(digits)
          }}
          placeholder="000000"
          value={verifyCode}
        />

        <Button
          disabled={isVerifying || verifyCode.length !== 6}
          fullWidth
          loading={isVerifying}
          sx={sx.submitButton}
          type="button"
          variant="contained"
          onClick={onConfirm}
        >
          Подтвердить
        </Button>

        <Button
          disabled={isResending || resendSecondsLeft > 0}
          fullWidth
          loading={isResending}
          sx={sx.secondaryAction}
          type="button"
          variant="text"
          onClick={onResend}
        >
          {resendSecondsLeft > 0
            ? `Отправить код снова (${resendSecondsLeft} с)`
            : 'Отправить код снова'}
        </Button>
      </Box>
    </RegisterStepLayout>
  )
}
