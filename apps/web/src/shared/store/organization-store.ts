import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getOrganizationById, organizations } from '../data/menu-data'

type OrganizationStore = {
  selectedOrganizationId: string
  setSelectedOrganizationId: (organizationId: string) => void
}

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set) => ({
      selectedOrganizationId: organizations[0]?.id ?? '',
      setSelectedOrganizationId: (organizationId) => {
        set({ selectedOrganizationId: organizationId })
      },
    }),
    {
      name: 'flowza.web.organization',
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
)

export function getSelectedOrganization(organizationId: string) {
  return getOrganizationById(organizationId)
}
