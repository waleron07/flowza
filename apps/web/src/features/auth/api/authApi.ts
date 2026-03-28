import { httpClient } from '../../../shared/api/http'
import { getApiErrorMessage } from '../../../shared/api/get-api-error-message'
import type {
  AuthResponseDto,
  AuthUser,
  LoginRequestDto,
  RegisterRequestDto,
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
    const response = await httpClient.post<AuthResponseDto>('/auth/register', payload)

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось выполнить регистрацию'))
  }
}

export async function getMeRequest(token: string) {
  try {
    const response = await httpClient.get<AuthUser>('/auth/me', {
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
