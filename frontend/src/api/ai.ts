import { apiClient, API_BASE } from './client'
import type { TaskStatus } from '@/types'

export const aiApi = {
  getTaskStatus: (taskId: string) => apiClient.get<TaskStatus>(`/ai/tasks/${taskId}`).then(r => r.data),

  runGapAnalysis: (resumeVersionId: string, jobDescription: string) =>
    apiClient.post<TaskStatus>('/ai/gap-analysis', {
      resume_version_id: resumeVersionId,
      job_description: jobDescription,
    }).then(r => r.data),

  scoreExperience: (experienceId: string, jobDescription: string) =>
    apiClient.post<TaskStatus>('/ai/score-experience', {
      experience_id: experienceId,
      job_description: jobDescription,
    }).then(r => r.data),
}

export function streamChat(
  messages: { role: string; content: string }[],
  conversationId?: string,
  resumeVersionId?: string,
  onChunk?: (chunk: string) => void,
  onDone?: () => void,
): AbortController {
  const controller = new AbortController()

  fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      conversation_id: conversationId,
      resume_version_id: resumeVersionId,
    }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) onChunk?.(data.chunk)
            if (data.done) onDone?.()
          } catch {}
        }
      }
    }
  }).catch(() => {})

  return controller
}

export function streamBulletRewrite(
  bulletText: string,
  jobDescription: string,
  onChunk?: (chunk: string) => void,
  onDone?: () => void,
): AbortController {
  const controller = new AbortController()

  fetch(`${API_BASE}/ai/rewrite-bullet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bullet_text: bulletText, job_description: jobDescription }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) onChunk?.(data.chunk)
            if (data.done) onDone?.()
          } catch {}
        }
      }
    }
  }).catch(() => {})

  return controller
}

export function generateDocumentUrl(resumeVersionId: string): string {
  return `${API_BASE}/documents/generate`
}

export async function suggestStyles(role?: string, industry?: string) {
  const res = await fetch(`${API_BASE}/ai/suggest-styles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: role || null, industry: industry || null }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function analyzeStyleImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/ai/analyze-style-image`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export function previewUrl(resumeVersionId: string): string {
  return `${API_BASE}/documents/preview/${resumeVersionId}`
}

export function downloadUrl(documentId: string): string {
  return `${API_BASE}/documents/${documentId}/download`
}
