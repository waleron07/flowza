import { httpClient } from '../../../shared/api/http'

type HealthResponseDto = {
  status: string
}

export async function getHealthRequest() {
  const response = await httpClient.get<HealthResponseDto>('/health')

  return response.data
}
