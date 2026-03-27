import { useMutation } from '@tanstack/react-query'
import { createStaffUserRequest } from './staffApi'

export function useCreateStaffMutation() {
  return useMutation({
    mutationFn: createStaffUserRequest,
  })
}
