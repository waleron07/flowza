import axios from 'axios'

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
        return message
      }

      if (Array.isArray(message)) {
        return message.join(', ')
      }
    }
  }

  return fallbackMessage
}
