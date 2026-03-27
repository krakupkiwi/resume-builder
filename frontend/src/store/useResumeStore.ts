import { create } from 'zustand'
import type { ResumeVersion } from '@/types'

interface ResumeState {
  resumes: ResumeVersion[]
  activeResumeId: string | null
  setResumes: (resumes: ResumeVersion[]) => void
  setActiveResume: (id: string | null) => void
  updateResume: (updated: ResumeVersion) => void
  addResume: (resume: ResumeVersion) => void
  removeResume: (id: string) => void
}

export const useResumeStore = create<ResumeState>((set) => ({
  resumes: [],
  activeResumeId: null,
  setResumes: (resumes) => set({ resumes }),
  setActiveResume: (id) => set({ activeResumeId: id }),
  updateResume: (updated) =>
    set((s) => ({ resumes: s.resumes.map((r) => (r.id === updated.id ? updated : r)) })),
  addResume: (resume) => set((s) => ({ resumes: [resume, ...s.resumes] })),
  removeResume: (id) => set((s) => ({ resumes: s.resumes.filter((r) => r.id !== id) })),
}))
