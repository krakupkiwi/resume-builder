import { apiClient } from './client'
import type { JobApplication, CoverLetter } from '@/types'

export const jobsApi = {
  list: (profileId: string) => apiClient.get<JobApplication[]>(`/profiles/${profileId}/jobs/`).then(r => r.data),
  get: (profileId: string, id: string) => apiClient.get<JobApplication>(`/profiles/${profileId}/jobs/${id}`).then(r => r.data),
  create: (profileId: string, data: Partial<JobApplication>) => apiClient.post<JobApplication>(`/profiles/${profileId}/jobs/`, data).then(r => r.data),
  update: (profileId: string, id: string, data: Partial<JobApplication>) => apiClient.patch<JobApplication>(`/profiles/${profileId}/jobs/${id}`, data).then(r => r.data),
  updateStatus: (profileId: string, id: string, status: string, notes?: string) =>
    apiClient.post<JobApplication>(`/profiles/${profileId}/jobs/${id}/status`, { status, notes }).then(r => r.data),
  delete: (profileId: string, id: string) => apiClient.delete(`/profiles/${profileId}/jobs/${id}`),
}

export const coverLettersApi = {
  create: (data: Partial<CoverLetter>) => apiClient.post<CoverLetter>('/cover-letters/', data).then(r => r.data),
  get: (id: string) => apiClient.get<CoverLetter>(`/cover-letters/${id}`).then(r => r.data),
  listByJob: (jobApplicationId: string) =>
    apiClient.get<CoverLetter[]>('/cover-letters/', { params: { job_application_id: jobApplicationId } }).then(r => r.data),
  update: (id: string, data: Partial<CoverLetter>) => apiClient.patch<CoverLetter>(`/cover-letters/${id}`, data).then(r => r.data),
  generate: (jobApplicationId: string, resumeVersionId?: string, tone?: string, notes?: string) =>
    apiClient.post('/cover-letters/generate', {
      job_application_id: jobApplicationId,
      resume_version_id: resumeVersionId,
      tone: tone || 'professional',
      additional_notes: notes,
    }).then(r => r.data),
}
