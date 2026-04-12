import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type OrganizationStore = {
  selectedOrganizationId: string;
  setSelectedOrganizationId: (organizationId: string) => void;
};

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set) => ({
      selectedOrganizationId: "",
      setSelectedOrganizationId: (organizationId) => {
        set({ selectedOrganizationId: organizationId });
      },
    }),
    {
      name: "flowza.web.organization",
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
