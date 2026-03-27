import { apiClient } from './client'
import type { ResumeVersion, ResumeBullet } from '@/types'

export const resumesApi = {
  list: (profileId: string) => apiClient.get<ResumeVersion[]>(`/profiles/${profileId}/resumes/`).then(r => r.data),
  get: (profileId: string, id: string) => apiClient.get<ResumeVersion>(`/profiles/${profileId}/resumes/${id}`).then(r => r.data),
  create: (profileId: string, data: Partial<ResumeVersion>) => apiClient.post<ResumeVersion>(`/profiles/${profileId}/resumes/`, data).then(r => r.data),
  update: (profileId: string, id: string, data: Partial<ResumeVersion>) => apiClient.patch<ResumeVersion>(`/profiles/${profileId}/resumes/${id}`, data).then(r => r.data),
  delete: (profileId: string, id: string) => apiClient.delete(`/profiles/${profileId}/resumes/${id}`),
}

export const bulletsApi = {
  list: (profileId: string, resumeId: string) => apiClient.get<ResumeBullet[]>(`/profiles/${profileId}/resumes/${resumeId}/bullets`).then(r => r.data),
  upsert: (profileId: string, resumeId: string, data: Partial<ResumeBullet>) => apiClient.post<ResumeBullet>(`/profiles/${profileId}/resumes/${resumeId}/bullets`, data).then(r => r.data),
  update: (profileId: string, resumeId: string, bulletId: string, data: Partial<ResumeBullet>) => apiClient.patch<ResumeBullet>(`/profiles/${profileId}/resumes/${resumeId}/bullets/${bulletId}`, data).then(r => r.data),
  delete: (profileId: string, resumeId: string, bulletId: string) => apiClient.delete(`/profiles/${profileId}/resumes/${resumeId}/bullets/${bulletId}`),
}
