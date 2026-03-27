import { useRef, useEffect, useState } from 'react'
import { Send, Sparkles, X, BarChart3, ChevronDown, ChevronUp, MessageSquare, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIStore } from '@/store/useAIStore'
import { useResumeStore } from '@/store/useResumeStore'
import { streamChat } from '@/api/ai'
import { API_BASE } from '@/api/client'
import type { ChatMessage, GapItem } from '@/types'

const CONFIDENCE_COLORS: Record<string, string> = {
  DIRECT: 'text-green-400',
  TRANSFERABLE: 'text-gold-400',
  ADJACENT: 'text-blue-400',
  WEAK: 'text-orange-400',
  GAP: 'text-red-400',
}

const CONFIDENCE_BG: Record<string, string> = {
  DIRECT: 'bg-green-900/30 border-green-800/40',
  TRANSFERABLE: 'bg-gold-500/10 border-gold-500/20',
  ADJACENT: 'bg-blue-900/30 border-blue-800/40',
  WEAK: 'bg-orange-900/30 border-orange-800/40',
  GAP: 'bg-red-900/30 border-red-800/40',
}

function GapAnalysisView({
  onStartInterview,
}: {
  onStartInterview: (gap: GapItem) => void
}) {
  const { gapAnalysis } = useAIStore()
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)
  if (!gapAnalysis) return null

  const score = Math.round(gapAnalysis.overall_match_score)
  const scoreColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-gold-400' : 'text-red-400'
  const interviewableGaps = gapAnalysis.gaps.filter(g => g.confidence === 'GAP' || g.confidence === 'WEAK')
  const displayGaps = showAll ? gapAnalysis.gaps : gapAnalysis.gaps.slice(0, 4)

  return (
    <div className="border border-forest-500 rounded bg-forest-800 mx-3 mb-3 text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-forest-700 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-gold-400" />
          <span className="font-mono text-xs text-cream-400 uppercase tracking-wider">Gap Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('font-mono font-medium', scoreColor)}>{score}%</span>
          {expanded ? <ChevronUp className="w-3 h-3 text-cream-500" /> : <ChevronDown className="w-3 h-3 text-cream-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-forest-500 pt-2">
          {/* Score bar */}
          <div className="h-1.5 bg-forest-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-gold-500' : 'bg-red-500')}
              style={{ width: `${score}%` }}
            />
          </div>

          {gapAnalysis.top_strengths.length > 0 && (
            <div>
              <p className="text-xs text-cream-500 mb-1">Strengths</p>
              {gapAnalysis.top_strengths.slice(0, 3).map((s, i) => (
                <p key={i} className="text-xs text-green-400 leading-relaxed">✓ {s}</p>
              ))}
            </div>
          )}

          {gapAnalysis.gaps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-cream-500">Requirements ({gapAnalysis.gaps.length})</p>
                {interviewableGaps.length > 0 && (
                  <span className="text-[10px] text-orange-400 font-mono">{interviewableGaps.length} gap{interviewableGaps.length !== 1 ? 's' : ''} to explore</span>
                )}
              </div>
              <div className="space-y-1">
                {displayGaps.map((gap, i) => (
                  <div key={i} className={cn('rounded px-2 py-1.5 border text-xs', CONFIDENCE_BG[gap.confidence])}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <span className={cn('font-mono text-[10px] uppercase mr-1.5', CONFIDENCE_COLORS[gap.confidence])}>{gap.confidence}</span>
                        <span className="text-cream-300">{gap.requirement}</span>
                      </div>
                      {(gap.confidence === 'GAP' || gap.confidence === 'WEAK') && (
                        <button
                          onClick={() => onStartInterview(gap)}
                          className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-gold-400 hover:text-gold-300 border border-gold-500/30 hover:border-gold-500/60 rounded px-1.5 py-0.5 transition-colors"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          Interview
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {gapAnalysis.gaps.length > 4 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-[10px] text-cream-500 hover:text-cream-300 mt-1 w-full text-left transition-colors"
                >
                  {showAll ? '↑ Show less' : `↓ Show ${gapAnalysis.gaps.length - 4} more`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AIChatPanel({ resumeVersionId }: { resumeVersionId?: string }) {
  const { messages, isStreaming, gapAnalysis, addMessage, appendToLastMessage, setStreaming, clearMessages } = useAIStore()
  const [input, setInput] = useState('')
  const [interviewGap, setInterviewGap] = useState<GapItem | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeResumeId = useResumeStore(s => s.activeResumeId)

  useEffect(() => {
    // Scroll only the messages container — never a parent via scrollIntoView
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || isStreaming) return
    if (!overrideText) setInput('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    addMessage(assistantMsg)
    setStreaming(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    abortRef.current = streamChat(
      history,
      undefined,
      resumeVersionId || activeResumeId || undefined,
      (chunk) => appendToLastMessage(chunk),
      () => setStreaming(false),
    )
  }

  const startInterview = (gap: GapItem) => {
    // Abort any current stream
    abortRef.current?.abort()
    clearMessages()
    setInterviewGap(gap)

    // Add an assistant loading message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    addMessage(assistantMsg)
    setStreaming(true)

    // Call the dedicated interview start endpoint
    const controller = new AbortController()
    abortRef.current = controller

    fetch(`${API_BASE}/ai/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: gap.requirement,
        confidence: gap.confidence,
        score: gap.score,
        evidence: gap.evidence,
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
              if (data.chunk) appendToLastMessage(data.chunk)
              if (data.done) setStreaming(false)
            } catch {}
          }
        }
      }
    }).catch(() => setStreaming(false))
  }

  const endInterview = () => {
    abortRef.current?.abort()
    setInterviewGap(null)
    clearMessages()
    setStreaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-forest-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-forest-500 h-10 shrink-0">
        <div className="flex items-center gap-2">
          {interviewGap ? (
            <button
              onClick={endInterview}
              className="flex items-center gap-1.5 text-cream-400 hover:text-cream-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs font-mono uppercase tracking-wider">Interview</span>
            </button>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-xs font-mono text-cream-400 uppercase tracking-wider">AI Assistant</span>
            </>
          )}
        </div>
        {isStreaming && (
          <button
            onClick={() => { abortRef.current?.abort(); setStreaming(false) }}
            className="text-cream-500 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Interview mode banner */}
      {interviewGap && (
        <div className="mx-3 mt-3 rounded border border-orange-800/50 bg-orange-900/20 px-3 py-2">
          <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider mb-0.5">Exploring Gap</p>
          <p className="text-xs text-cream-300 leading-relaxed">{interviewGap.requirement}</p>
          <p className="text-[10px] text-cream-500 mt-1">Answer naturally — the AI will help surface experience you may have missed.</p>
        </div>
      )}

      {/* Gap analysis (only when not in interview mode) */}
      {!interviewGap && gapAnalysis && (
        <div className="pt-3">
          <GapAnalysisView onStartInterview={startInterview} />
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && !interviewGap && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-forest-400 mx-auto mb-3" />
            <p className="text-sm text-cream-500 font-display italic">Your AI career coach</p>
            <p className="text-xs text-cream-500 mt-1 leading-relaxed">
              Run a gap analysis, then use Interview buttons to surface experience you may have missed.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'animate-fade-in',
              msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-5 h-5 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-gold-400" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-gold-500/15 border border-gold-500/25 text-cream-200'
                  : 'bg-forest-800 border border-forest-500 text-cream-300'
              )}
            >
              {msg.isStreaming && msg.content === '' ? (
                <div className="ai-thinking flex gap-1 py-1">
                  <span /><span /><span />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-forest-500 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={interviewGap ? 'Share your experience...' : 'Ask the AI assistant...'}
            className="textarea-field flex-1 h-[60px] text-xs resize-none"
            disabled={isStreaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="btn-primary px-3 self-end h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-cream-500 mt-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
