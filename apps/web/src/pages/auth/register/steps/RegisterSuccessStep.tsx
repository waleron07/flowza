import { Alert, Box } from '@mui/material'
import { RegisterStepLayout } from './RegisterStepLayout'
import { sx } from '../styles'

export function RegisterSuccessStep() {
  return (
    <RegisterStepLayout
      subtitle="Сейчас вы будете перенаправлены в приложение."
      title="Регистрация завершена"
    >
      <Box sx={sx.form}>
        <Alert severity="success">
          Регистрация прошла успешно. Добро пожаловать в Flowza.
        </Alert>
      </Box>
    </RegisterStepLayout>
  )
}
