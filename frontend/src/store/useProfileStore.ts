import { create } from 'zustand'
import type { UserProfile, ExperienceEntry } from '@/types'

interface ProfileState {
  profiles: UserProfile[]
  activeProfileId: string | null
  experiences: ExperienceEntry[]
  setProfiles: (profiles: UserProfile[]) => void
  setActiveProfile: (id: string) => void
  setExperiences: (experiences: ExperienceEntry[]) => void
  updateProfile: (updated: UserProfile) => void
  addExperience: (exp: ExperienceEntry) => void
  updateExperience: (updated: ExperienceEntry) => void
  removeExperience: (id: string) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeProfileId: null,
  experiences: [],
  setProfiles: (profiles) => set({ profiles, activeProfileId: profiles[0]?.id ?? null }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setExperiences: (experiences) => set({ experiences }),
  updateProfile: (updated) =>
    set((s) => ({ profiles: s.profiles.map((p) => (p.id === updated.id ? updated : p)) })),
  addExperience: (exp) => set((s) => ({ experiences: [exp, ...s.experiences] })),
  updateExperience: (updated) =>
    set((s) => ({
      experiences: s.experiences.map((e) => (e.id === updated.id ? updated : e)),
    })),
  removeExperience: (id) =>
    set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) })),
}))
