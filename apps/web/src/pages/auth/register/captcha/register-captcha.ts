import type { RefObject } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

const TURNSTILE_RESPONSE_NAME = 'cf-turnstile-response'

/** Ответ тестовых site key Cloudflare (всегда один и тот же); с тестовым secret на бэкенде проходит проверку. */
export const CLOUDFLARE_TURNSTILE_TEST_SITE_RESPONSE = 'XXXX.DUMMY.TOKEN.XXXX'

function turnstileDebugEnabled(): boolean {
  return (
    import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_TURNSTILE ?? '').trim() === '1'
  )
}

function tokenPreview(t: string): string {
  if (!t) {
    return '(пусто)'
  }
  if (t.length <= 32) {
    return `[len=${t.length}] ${t}`
  }
  return `[len=${t.length}] ${t.slice(0, 14)}…${t.slice(-10)}`
}

function explainInvalidToken(token: string): string {
  const trimmed = token.trim()
  if (!trimmed) {
    return 'пустая строка'
  }
  if (trimmed === CLOUDFLARE_TURNSTILE_TEST_SITE_RESPONSE) {
    return 'официальный тестовый токен Cloudflare (ok)'
  }
  if (trimmed.includes('XXXX.DUMMY')) {
    return 'заглушка XXXX.DUMMY'
  }
  if (trimmed.length < 80 && /\bdummy\b/i.test(trimmed)) {
    return `короткая строка (${trimmed.length}) + слово dummy`
  }
  if (trimmed.length < 8) {
    return `слишком коротко (${trimmed.length} симв.)`
  }
  return 'ок'
}

function turnstileDebug(...args: unknown[]) {
  if (turnstileDebugEnabled()) {
    console.log('[Turnstile debug]', ...args)
  }
}

/** Скрытое поле, которое вставляет Cloudflare (иногда актуальнее, чем getResponse() в тот же тик). */
export function getTurnstileResponseFromDom(): string {
  if (typeof document === 'undefined') {
    return ''
  }
  const root = document.getElementById('cf-turnstile')
  const scope: ParentNode = root ?? document
  const el = scope.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `input[name="${TURNSTILE_RESPONSE_NAME}"], textarea[name="${TURNSTILE_RESPONSE_NAME}"]`,
  )
  const value = el?.value?.trim() ?? ''
  turnstileDebug('DOM: #cf-turnstile есть?', Boolean(root), 'поле response найдено?', Boolean(el), 'длина', value.length)
  return value
}

/** Токен из виджета / DOM; Formik может держать устаревшее значение при Strict Mode / перерисовках. */
export function resolveTurnstileTokenForSubmit(
  formValue: string,
  widgetRef: RefObject<TurnstileInstance | null>,
  useWidget: boolean,
): string {
  if (!useWidget) {
    turnstileDebug('resolve(sync): виджет выключен → значение формы', tokenPreview(formValue))
    return formValue
  }
  const refOk = Boolean(widgetRef.current)
  const fromApi = widgetRef.current?.getResponse?.()
  turnstileDebug(
    'resolve(sync): ref на виджет',
    refOk,
    'getResponse()',
    typeof fromApi === 'string' ? tokenPreview(fromApi) : `(не строка: ${typeof fromApi})`,
    'formik captchaToken',
    tokenPreview(formValue),
  )
  if (typeof fromApi === 'string' && fromApi.trim().length > 0) {
    return fromApi.trim()
  }
  const fromDom = getTurnstileResponseFromDom()
  if (fromDom.length > 0) {
    turnstileDebug('resolve(sync): взято из DOM', tokenPreview(fromDom))
    return fromDom
  }
  turnstileDebug('resolve(sync): итог = formik', tokenPreview(formValue))
  return formValue
}

/**
 * Эвристика «точно не токен Turnstile» (пусто, явная заглушка, слишком короткая строка).
 * Тестовые ключи Cloudflare всегда отдают {@link CLOUDFLARE_TURNSTILE_TEST_SITE_RESPONSE} — его принимаем.
 */
export function looksLikeInvalidTurnstileClientToken(token: string): boolean {
  const t = token.trim()
  if (!t) {
    return true
  }
  if (t === CLOUDFLARE_TURNSTILE_TEST_SITE_RESPONSE) {
    return false
  }
  if (t.includes('XXXX.DUMMY')) {
    return true
  }
  if (t.length < 80 && /\bdummy\b/i.test(t)) {
    return true
  }
  if (t.length < 8) {
    return true
  }
  return false
}

/** Если синхронно токен не собрался, ждём готовность виджета (after-interactive / callback). */
export async function resolveTurnstileTokenForSubmitAsync(
  formValue: string,
  widgetRef: RefObject<TurnstileInstance | null>,
  useWidget: boolean,
): Promise<string> {
  let token = resolveTurnstileTokenForSubmit(formValue, widgetRef, useWidget)
  const invalidAfterSync = looksLikeInvalidTurnstileClientToken(token)
  turnstileDebug(
    'resolve(async): после первого resolve',
    tokenPreview(token),
    'invalid?',
    invalidAfterSync,
    'причина',
    explainInvalidToken(token),
  )
  if (!useWidget || !invalidAfterSync) {
    return token
  }

  const inst = widgetRef.current
  turnstileDebug('resolve(async): пробуем getResponsePromise (8s)…', 'есть метод?', Boolean(inst?.getResponsePromise))
  if (inst?.getResponsePromise) {
    try {
      const waited = await inst.getResponsePromise(8000, 100)
      turnstileDebug(
        'resolve(async): getResponsePromise вернул',
        typeof waited === 'string' ? tokenPreview(waited) : String(waited),
      )
      if (typeof waited === 'string' && waited.trim().length > 0) {
        return waited.trim()
      }
    } catch (e) {
      turnstileDebug('resolve(async): getResponsePromise ошибка', e)
    }
  }

  token = resolveTurnstileTokenForSubmit(formValue, widgetRef, useWidget)
  turnstileDebug('resolve(async): финал после повторного resolve', tokenPreview(token), explainInvalidToken(token))
  return token
}
