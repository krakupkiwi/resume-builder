import { useRef, useEffect, useState } from 'react'
import { Send, Sparkles, X, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIStore } from '@/store/useAIStore'
import { useResumeStore } from '@/store/useResumeStore'
import { streamChat } from '@/api/ai'
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

function GapAnalysisView() {
  const { gapAnalysis } = useAIStore()
  const [expanded, setExpanded] = useState(true)
  if (!gapAnalysis) return null

  const score = Math.round(gapAnalysis.overall_match_score)
  const scoreColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-gold-400' : 'text-red-400'

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
        <div className="px-3 pb-3 space-y-2 border-t border-forest-500 pt-2">
          {/* Score bar */}
          <div className="h-1.5 bg-forest-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-gold-500' : 'bg-red-500')}
              style={{ width: `${score}%` }}
            />
          </div>

          {gapAnalysis.top_strengths.length > 0 && (
            <div>
              <p className="text-xs text-cream-500 mb-1">Strengths</p>
              {gapAnalysis.top_strengths.slice(0, 2).map((s, i) => (
                <p key={i} className="text-xs text-green-400">✓ {s}</p>
              ))}
            </div>
          )}

          {gapAnalysis.gaps.filter(g => g.confidence === 'GAP' || g.confidence === 'WEAK').length > 0 && (
            <div>
              <p className="text-xs text-cream-500 mb-1">Key Gaps</p>
              {gapAnalysis.gaps
                .filter(g => g.confidence === 'GAP' || g.confidence === 'WEAK')
                .slice(0, 3)
                .map((gap, i) => (
                  <div key={i} className={cn('rounded px-2 py-1 border text-xs mb-1', CONFIDENCE_BG[gap.confidence])}>
                    <span className={CONFIDENCE_COLORS[gap.confidence]}>{gap.confidence}</span>
                    <span className="text-cream-300 ml-1">{gap.requirement}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AIChatPanel({ resumeVersionId }: { resumeVersionId?: string }) {
  const { messages, isStreaming, addMessage, appendToLastMessage, setStreaming } = useAIStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeResumeId = useResumeStore(s => s.activeResumeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-forest-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-forest-500 h-10 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span className="text-xs font-mono text-cream-400 uppercase tracking-wider">AI Assistant</span>
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

      {/* Gap analysis */}
      <GapAnalysisView />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-forest-400 mx-auto mb-3" />
            <p className="text-sm text-cream-500 font-display italic">Your AI career coach</p>
            <p className="text-xs text-cream-500 mt-1 leading-relaxed">
              Ask me to analyse a job description, rewrite a bullet, or generate a cover letter.
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-forest-500 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI assistant..."
            className="textarea-field flex-1 h-[60px] text-xs resize-none"
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
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
