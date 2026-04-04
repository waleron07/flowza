import { httpClient } from '../../../shared/api/http'
import { getApiErrorMessage } from '../../../shared/api/get-api-error-message'
import type { CreateStaffUserDto } from '../../../shared/types/users'

type StaffUserResponseDto = {
  id: number
  phone: string
  login: string
  email: string
  role: string
  tenantId: number | null
  isActive: boolean
}

export async function createStaffUserRequest(payload: CreateStaffUserDto) {
  try {
    const response = await httpClient.post<StaffUserResponseDto>('/users/staff', payload)

    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Не удалось создать сотрудника'))
  }
}
