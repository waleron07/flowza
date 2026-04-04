import { Box } from '@mui/material'
import type { FormikHelpers } from 'formik'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { memo, useCallback, useMemo, useRef, type RefObject } from 'react'

type RegisterTurnstileProps = {
  siteKey: string
  turnstileRef: RefObject<TurnstileInstance | null>
  setFieldValue: FormikHelpers<Record<string, unknown>>['setFieldValue']
  setFieldTouched: FormikHelpers<Record<string, unknown>>['setFieldTouched']
}

/**
 * Отдельный компонент, чтобы колбэки и `options` не пересоздавались на каждом рендере Formik
 * (иначе Turnstile снимается и монтируется снова → «Идёт проверка…» по кругу).
 */
export const RegisterTurnstile = memo(function RegisterTurnstile({
  siteKey,
  turnstileRef,
  setFieldValue,
  setFieldTouched,
}: RegisterTurnstileProps) {
  const setFieldValueRef = useRef(setFieldValue)
  const setFieldTouchedRef = useRef(setFieldTouched)
  setFieldValueRef.current = setFieldValue
  setFieldTouchedRef.current = setFieldTouched

  const options = useMemo(() => ({ language: 'ru' as const }), [])

  const onSuccess = useCallback((token: string) => {
    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_TURNSTILE === '1') {
      console.log('[Turnstile debug] onSuccess в Formik', {
        length: token?.length ?? 0,
        preview:
          token && token.length > 32
            ? `${token.slice(0, 14)}…${token.slice(-10)}`
            : token,
      })
    }
    void setFieldValueRef.current('captchaToken', token)
    void setFieldTouchedRef.current('captchaToken', true)
  }, [])

  const onExpire = useCallback(() => {
    void setFieldValueRef.current('captchaToken', '')
  }, [])

  const onError = useCallback(() => {
    void setFieldValueRef.current('captchaToken', '')
  }, [])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Turnstile
        ref={turnstileRef}
        options={options}
        siteKey={siteKey}
        onError={onError}
        onExpire={onExpire}
        onSuccess={onSuccess}
      />
    </Box>
  )
})
