import { create } from 'zustand'

export type TabKey = 'add' | 'history'

type UiState = {
  tab: TabKey
  setTab: (t: TabKey) => void
}

export const useUiStore = create<UiState>((set) => ({
  tab: 'add',
  setTab: (tab) => set({ tab }),
}))

