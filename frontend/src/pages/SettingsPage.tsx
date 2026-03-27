import { useEffect, useState } from 'react'
import { Save, Zap, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/api/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AISettings {
  AI_PROVIDER: string
  ANTHROPIC_API_KEY: string
  CLAUDE_MODEL: string
  OPENAI_API_KEY: string
  OPENAI_MODEL: string
  OLLAMA_BASE_URL: string
  OLLAMA_MODEL: string
}

interface TestResult {
  ok: boolean
  message: string
}

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', desc: 'claude-opus-4-5, claude-sonnet-4-5' },
  { value: 'openai', label: 'OpenAI', desc: 'gpt-4o, gpt-4o-mini' },
  { value: 'ollama', label: 'Ollama (local)', desc: 'llama3.2, mistral, phi3, etc.' },
]

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  const isMasked = value.includes('...')

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className="input-field pr-9 font-mono text-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'sk-...'}
      />
      {!isMasked && (
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cream-500 hover:text-cream-300"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

export function SettingsPage() {
  const [form, setForm] = useState<AISettings>({
    AI_PROVIDER: 'claude',
    ANTHROPIC_API_KEY: '',
    CLAUDE_MODEL: 'claude-opus-4-5',
    OPENAI_API_KEY: '',
    OPENAI_MODEL: 'gpt-4o',
    OLLAMA_BASE_URL: 'http://ollama:11434',
    OLLAMA_MODEL: 'llama3.2',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    apiClient.get<AISettings>('/settings').then(res => {
      setForm(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const set = (key: keyof AISettings, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setTestResult(null)
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await apiClient.patch<AISettings>('/settings', form)
      setForm(res.data)
      toast.success('Settings saved')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so the test uses the latest values
      await apiClient.patch('/settings', form)
      const res = await apiClient.post<TestResult>('/settings/test')
      setTestResult(res.data)
    } catch (err: any) {
      setTestResult({ ok: false, message: err.response?.data?.detail || 'Request failed' })
    } finally {
      setTesting(false)
    }
  }

  const provider = form.AI_PROVIDER

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 animate-fade-in">
      <div className="max-w-xl mx-auto">
        <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Settings</p>
        <h1 className="font-display text-2xl text-cream-100 mb-6">Configuration</h1>

        {/* AI Provider */}
        <div className="panel rounded-lg p-5 mb-4">
          <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-4">AI Provider</h2>

          <div className="grid grid-cols-1 gap-2 mb-5">
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => set('AI_PROVIDER', p.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                  provider === p.value
                    ? 'border-gold-500 bg-gold-500/5'
                    : 'border-forest-600 hover:border-forest-400 hover:bg-forest-800'
                )}
              >
                <div className={cn(
                  'w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 transition-colors',
                  provider === p.value ? 'border-gold-500 bg-gold-500' : 'border-forest-400'
                )} />
                <div>
                  <p className={cn('text-sm font-500', provider === p.value ? 'text-cream-100' : 'text-cream-300')}>
                    {p.label}
                  </p>
                  <p className="text-xs text-cream-500 mt-0.5">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Claude settings */}
          {provider === 'claude' && (
            <div className="space-y-3">
              <div>
                <label className="label">Anthropic API Key</label>
                <SecretInput
                  value={form.ANTHROPIC_API_KEY}
                  onChange={v => set('ANTHROPIC_API_KEY', v)}
                  placeholder="sk-ant-..."
                />
                <p className="text-xs text-cream-500 mt-1">
                  Get your key at console.anthropic.com
                </p>
              </div>
              <div>
                <label className="label">Model</label>
                <select
                  className="input-field"
                  value={form.CLAUDE_MODEL}
                  onChange={e => set('CLAUDE_MODEL', e.target.value)}
                >
                  <option value="claude-opus-4-5">claude-opus-4-5 (most capable)</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5 (balanced)</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5 (fastest)</option>
                  <option value="claude-opus-4-6">claude-opus-4-6</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                </select>
              </div>
            </div>
          )}

          {/* OpenAI settings */}
          {provider === 'openai' && (
            <div className="space-y-3">
              <div>
                <label className="label">OpenAI API Key</label>
                <SecretInput
                  value={form.OPENAI_API_KEY}
                  onChange={v => set('OPENAI_API_KEY', v)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-cream-500 mt-1">
                  Get your key at platform.openai.com
                </p>
              </div>
              <div>
                <label className="label">Model</label>
                <select
                  className="input-field"
                  value={form.OPENAI_MODEL}
                  onChange={e => set('OPENAI_MODEL', e.target.value)}
                >
                  <option value="gpt-4o">gpt-4o (recommended)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (cheaper)</option>
                  <option value="gpt-4-turbo">gpt-4-turbo</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (basic)</option>
                </select>
              </div>
            </div>
          )}

          {/* Ollama settings */}
          {provider === 'ollama' && (
            <div className="space-y-3">
              <div>
                <label className="label">Ollama URL</label>
                <input
                  className="input-field font-mono text-sm"
                  value={form.OLLAMA_BASE_URL}
                  onChange={e => set('OLLAMA_BASE_URL', e.target.value)}
                  placeholder="http://ollama:11434"
                />
                <p className="text-xs text-cream-500 mt-1">
                  Default: http://ollama:11434 (Docker network) or http://localhost:11434
                </p>
              </div>
              <div>
                <label className="label">Model</label>
                <input
                  className="input-field font-mono text-sm"
                  value={form.OLLAMA_MODEL}
                  onChange={e => set('OLLAMA_MODEL', e.target.value)}
                  placeholder="llama3.2"
                />
                <p className="text-xs text-cream-500 mt-1">
                  Must be pulled in Ollama first: <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">ollama pull llama3.2</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Test connection result */}
        {testResult && (
          <div className={cn(
            'rounded-lg border p-3 mb-4 flex items-start gap-2 text-sm',
            testResult.ok
              ? 'border-green-700 bg-green-900/20 text-green-300'
              : 'border-red-700 bg-red-900/20 text-red-300'
          )}>
            {testResult.ok
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span className="text-xs leading-relaxed">{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={testing || saving}
            className="btn-ghost flex-1 justify-center"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Test Connection
          </button>
          <button
            onClick={save}
            disabled={saving || testing}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Settings
          </button>
        </div>

        <div className="section-divider mt-6 mb-5" />

        {/* About */}
        <div className="panel rounded-lg p-5">
          <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-3">About</h2>
          <p className="text-xs text-cream-500">Resume Builder — Self-hosted, Docker-first career tools.</p>
          <p className="text-xs text-cream-500 mt-1">All AI suggestions are grounded in your real experience. Nothing is fabricated.</p>
        </div>
      </div>
    </div>
  )
}
