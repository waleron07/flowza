import { httpClient } from '../../../shared/api/http'
import { getApiErrorMessage } from '../../../shared/api/get-api-error-message'
import type {
  AuthApiUser,
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  RegisterResponseDto,
  ResendEmailCodeRequestDto,
  ResendEmailCodeResponseDto,
  VerifyEmailRequestDto,
} from '../../../shared/types/auth'

export async function loginRequest(payload: LoginRequestDto) {
  try {
    const response = await httpClient.post<AuthResponseDto>('/auth/login', payload)

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось выполнить вход'))
  }
}

export async function registerRequest(payload: RegisterRequestDto) {
  try {
    const response = await httpClient.post<RegisterResponseDto>('/auth/register', payload)

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось выполнить регистрацию'))
  }
}

export async function verifyEmailRequest(payload: VerifyEmailRequestDto) {
  try {
    const response = await httpClient.post<AuthResponseDto>(
      '/auth/register/verify-email',
      payload,
    )

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Неверный или просроченный код'))
  }
}

export async function resendEmailCodeRequest(payload: ResendEmailCodeRequestDto) {
  try {
    const response = await httpClient.post<ResendEmailCodeResponseDto>(
      '/auth/register/resend-email-code',
      payload,
    )

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось отправить код повторно'))
  }
}

export async function getMeRequest(token: string) {
  try {
    const response = await httpClient.get<AuthApiUser>('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось восстановить сессию'))
  }
}

export async function deleteMeRequest() {
  try {
    const response = await httpClient.delete<{ success: boolean }>('/auth/me')

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось удалить аккаунт'))
  }
}
