import { apiClient } from './client'
import type { UserProfile, ExperienceEntry } from '@/types'

export const profilesApi = {
  list: () => apiClient.get<UserProfile[]>('/profiles/').then(r => r.data),
  get: (id: string) => apiClient.get<UserProfile>(`/profiles/${id}`).then(r => r.data),
  create: (data: Partial<UserProfile>) => apiClient.post<UserProfile>('/profiles/', data).then(r => r.data),
  update: (id: string, data: Partial<UserProfile>) => apiClient.patch<UserProfile>(`/profiles/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/profiles/${id}`),
}

export const experienceApi = {
  list: (profileId: string) => apiClient.get<ExperienceEntry[]>(`/profiles/${profileId}/experience/`).then(r => r.data),
  create: (profileId: string, data: Partial<ExperienceEntry>) => apiClient.post<ExperienceEntry>(`/profiles/${profileId}/experience/`, data).then(r => r.data),
  update: (profileId: string, id: string, data: Partial<ExperienceEntry>) => apiClient.patch<ExperienceEntry>(`/profiles/${profileId}/experience/${id}`, data).then(r => r.data),
  delete: (profileId: string, id: string) => apiClient.delete(`/profiles/${profileId}/experience/${id}`),
}
