import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pollTask(
  taskId: string,
  onSuccess: (result: unknown) => void,
  onError?: (error: string) => void,
  intervalMs = 1500,
  maxAttempts = 40
): () => void {
  let attempts = 0
  const timer = setInterval(async () => {
    attempts++
    try {
      const res = await fetch(`/api/v1/ai/tasks/${taskId}`)
      const data = await res.json()
      if (data.status === 'success') {
        clearInterval(timer)
        onSuccess(data.result)
      } else if (data.status === 'failure') {
        clearInterval(timer)
        onError?.(data.error || 'Task failed')
      } else if (attempts >= maxAttempts) {
        clearInterval(timer)
        onError?.('Task timed out')
      }
    } catch {
      if (attempts >= maxAttempts) {
        clearInterval(timer)
        onError?.('Task polling failed')
      }
    }
  }, intervalMs)

  return () => clearInterval(timer)
}
