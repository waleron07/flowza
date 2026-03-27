import { useQuery } from '@tanstack/react-query'
import { getHealthRequest } from './systemApi'

export function useHealthQuery() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: getHealthRequest,
    staleTime: 30_000,
  })
}
