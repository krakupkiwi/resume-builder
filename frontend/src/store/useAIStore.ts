import { create } from 'zustand'
import type { ChatMessage, GapAnalysisResult } from '@/types'

interface AIState {
  messages: ChatMessage[]
  isStreaming: boolean
  gapAnalysis: GapAnalysisResult | null
  pendingTaskId: string | null
  addMessage: (msg: ChatMessage) => void
  appendToLastMessage: (chunk: string) => void
  setStreaming: (v: boolean) => void
  setGapAnalysis: (result: GapAnalysisResult) => void
  setPendingTaskId: (id: string | null) => void
  clearMessages: () => void
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  isStreaming: false,
  gapAnalysis: null,
  pendingTaskId: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendToLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1]
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
      }
      return { messages: msgs }
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setGapAnalysis: (gapAnalysis) => set({ gapAnalysis }),
  setPendingTaskId: (pendingTaskId) => set({ pendingTaskId }),
  clearMessages: () => set({ messages: [] }),
}))
