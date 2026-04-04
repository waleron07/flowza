import axios from 'axios'
import { fixApiMessageMojibake } from '../lib/fix-utf8-mojibake'

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data

    if (
      responseMessage &&
      typeof responseMessage === 'object' &&
      'message' in responseMessage
    ) {
      const message = responseMessage.message

      if (typeof message === 'string') {
        return fixApiMessageMojibake(message)
      }

      if (Array.isArray(message)) {
        const parts = message.map((item) =>
          typeof item === 'string' ? fixApiMessageMojibake(item) : String(item),
        )
        return parts.join(', ')
      }
    }
  }

  return fallbackMessage
}
