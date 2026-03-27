import { useRef, useState } from 'react'
import {
  X,
  Palette,
  Sparkles,
  Upload,
  ImageIcon,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { suggestStyles, analyzeStyleImage } from '@/api/ai'
import type { StyleConfig, StylePreset } from '@/types'

// ─── Built-in presets ───────────────────────────────────────────────────────

const GALLERY_PRESETS: StylePreset[] = [
  { name: 'Classic Navy',    description: 'Traditional serif with dark navy — timeless and authoritative.', vibe: 'formal',   template_name: 'classic', accent_color: '#1a1a2e', font: 'serif',    spacing: 'normal',   name_size: 20 },
  { name: 'Corporate Blue',  description: 'Blue banner header — trusted across finance and consulting.',    vibe: 'modern',   template_name: 'modern',  accent_color: '#0f3d66', font: 'sans',     spacing: 'normal',   name_size: 22 },
  { name: 'Clean Minimal',   description: 'Barely-there styling — lets your content speak for itself.',    vibe: 'minimal',  template_name: 'minimal', accent_color: '#333333', font: 'sans',     spacing: 'normal',   name_size: 18 },
  { name: 'Executive',       description: 'Spacious serif with deep charcoal — senior leadership feel.',   vibe: 'elegant',  template_name: 'classic', accent_color: '#2c2c2c', font: 'serif',    spacing: 'spacious', name_size: 24 },
  { name: 'Teal Modern',     description: 'Fresh teal banner — stands out in tech and product roles.',     vibe: 'modern',   template_name: 'modern',  accent_color: '#0a7464', font: 'sans',     spacing: 'normal',   name_size: 22 },
  { name: 'Burgundy Classic',description: 'Rich burgundy serif — distinctive without being flashy.',       vibe: 'elegant',  template_name: 'classic', accent_color: '#6b2137', font: 'serif',    spacing: 'normal',   name_size: 20 },
  { name: 'Tech Compact',    description: 'Dense sans-serif in steel blue — efficient for engineers.',     vibe: 'modern',   template_name: 'modern',  accent_color: '#1a3d5c', font: 'sans',     spacing: 'compact',  name_size: 20 },
  { name: 'Forest Green',    description: 'Humanist font with deep green — warm and approachable.',        vibe: 'modern',   template_name: 'modern',  accent_color: '#2d6a4f', font: 'humanist', spacing: 'normal',   name_size: 22 },
  { name: 'Warm Amber',      description: 'Airy serif with amber — creative industries and consultants.', vibe: 'creative', template_name: 'classic', accent_color: '#7b5e2a', font: 'serif',    spacing: 'spacious', name_size: 20 },
]

const ACCENT_SWATCHES = [
  '#1a1a2e', '#0f3d66', '#0a7464', '#6b2137', '#2d6a4f',
  '#1a3d5c', '#7b5e2a', '#3b1f6b', '#6b3a2e', '#2c2c2c',
  '#0a4d68', '#4a1942', '#1b4332', '#7d4e00', '#003566',
]

const FONT_OPTIONS = [
  { value: 'serif',    label: 'Serif',    example: 'Georgia' },
  { value: 'sans',     label: 'Sans',     example: 'Arial' },
  { value: 'humanist', label: 'Humanist', example: 'Calibri' },
  { value: 'mono',     label: 'Mono',     example: 'Courier' },
] as const

const SPACING_OPTIONS = [
  { value: 'compact',  label: 'Compact'  },
  { value: 'normal',   label: 'Normal'   },
  { value: 'spacious', label: 'Spacious' },
] as const

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'gallery' | 'discover' | 'upload'

interface Props {
  currentTemplateName: string
  currentStyleConfig: StyleConfig
  onApply: (templateName: string, styleConfig: StyleConfig) => void
  onClose: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function presetMatches(preset: StylePreset, templateName: string, style: StyleConfig) {
  return (
    preset.template_name === templateName &&
    preset.accent_color === style.accent_color &&
    preset.font === style.font &&
    preset.spacing === style.spacing
  )
}

function StyleCard({
  preset,
  active,
  onSelect,
}: {
  preset: StylePreset
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'text-left rounded border p-3 transition-all group relative',
        active
          ? 'border-gold-500/70 bg-gold-500/10'
          : 'border-forest-500 hover:border-forest-400 hover:bg-forest-800/50',
      )}
    >
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-forest-950" />
        </span>
      )}
      {/* Color chip + template badge */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-5 h-5 rounded-full shrink-0 border border-white/10"
          style={{ background: preset.accent_color }}
        />
        <span className="text-[10px] font-mono text-cream-500 uppercase tracking-wider">
          {preset.template_name}
        </span>
        <span className="text-[10px] font-mono text-cream-500 ml-auto opacity-60 capitalize">
          {preset.vibe}
        </span>
      </div>
      <p className="text-xs font-500 text-cream-200 mb-0.5">{preset.name}</p>
      <p className="text-[10px] text-cream-500 leading-relaxed line-clamp-2">{preset.description}</p>
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function StylesModal({ currentTemplateName, currentStyleConfig, onApply, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('gallery')

  // Working copies — committed only when Apply is clicked
  const [draftTemplate, setDraftTemplate] = useState(currentTemplateName)
  const [draftStyle, setDraftStyle] = useState<StyleConfig>({ ...currentStyleConfig })

  // Discover tab
  const [role, setRole] = useState('')
  const [industry, setIndustry] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [discovered, setDiscovered] = useState<StylePreset[]>([])
  const [discoverError, setDiscoverError] = useState('')

  // Upload tab
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState<(StylePreset & { description: string }) | null>(null)
  const [analyzeError, setAnalyzeError] = useState('')

  // ── Draft helpers ──

  function selectPreset(preset: StylePreset) {
    setDraftTemplate(preset.template_name)
    setDraftStyle({
      accent_color: preset.accent_color,
      font: preset.font,
      spacing: preset.spacing,
      name_size: preset.name_size,
    })
  }

  function updateDraftStyle(patch: Partial<StyleConfig>) {
    setDraftStyle(prev => ({ ...prev, ...patch }))
  }

  // ── Discover ──

  async function runDiscover() {
    if (!role.trim() && !industry.trim()) return
    setDiscovering(true)
    setDiscoverError('')
    setDiscovered([])
    try {
      const presets = await suggestStyles(role.trim() || undefined, industry.trim() || undefined)
      setDiscovered(presets)
    } catch (e: any) {
      setDiscoverError(e.message || 'Style suggestion failed')
    } finally {
      setDiscovering(false)
    }
  }

  // ── Upload ──

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setUploadFile(f)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setUploadFile(f)
  }

  async function runAnalyze() {
    if (!uploadFile) return
    setAnalyzing(true)
    setAnalyzeError('')
    setAnalyzed(null)
    try {
      const result = await analyzeStyleImage(uploadFile)
      setAnalyzed({
        name: 'From your upload',
        vibe: 'custom',
        template_name: result.template_name || 'classic',
        accent_color: result.accent_color || '#1a1a2e',
        font: result.font || 'serif',
        spacing: result.spacing || 'normal',
        name_size: result.name_size || 20,
        description: result.description || 'Style extracted from your uploaded resume.',
      })
    } catch (e: any) {
      setAnalyzeError(e.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Apply ──

  function handleApply() {
    onApply(draftTemplate, draftStyle)
  }

  const isDraftActive = (preset: StylePreset) =>
    presetMatches(preset, draftTemplate, draftStyle)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-forest-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-forest-900 border border-forest-500 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-500 shrink-0">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-gold-400" />
            <span className="font-display text-base text-cream-200">Resume Styles</span>
          </div>
          <button onClick={onClose} className="text-cream-500 hover:text-cream-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-forest-500 shrink-0">
          {([
            { id: 'gallery',  label: 'Gallery',  icon: Palette },
            { id: 'discover', label: 'Discover',  icon: Sparkles },
            { id: 'upload',   label: 'Upload',    icon: Upload },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors',
                tab === id
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-cream-500 hover:text-cream-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Gallery ── */}
          {tab === 'gallery' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {GALLERY_PRESETS.map(preset => (
                  <StyleCard
                    key={preset.name}
                    preset={preset}
                    active={isDraftActive(preset)}
                    onSelect={() => selectPreset(preset)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Discover ── */}
          {tab === 'discover' && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-cream-500 leading-relaxed">
                Enter your target role and/or industry and the AI will suggest styles suited to those conventions.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Job Role</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Software Engineer"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runDiscover()}
                  />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Finance, Healthcare"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runDiscover()}
                  />
                </div>
              </div>
              <button
                onClick={runDiscover}
                disabled={discovering || (!role.trim() && !industry.trim())}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {discovering
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding styles...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Find Styles</>}
              </button>

              {discoverError && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded px-3 py-2">
                  {discoverError}
                </p>
              )}

              {discovered.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {discovered.map((preset, i) => (
                    <StyleCard
                      key={i}
                      preset={preset}
                      active={isDraftActive(preset)}
                      onSelect={() => selectPreset(preset)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Upload ── */}
          {tab === 'upload' && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-cream-500 leading-relaxed">
                Upload a PNG or JPG screenshot of a resume you like. The AI will analyse its colours, fonts, and layout and apply a matching style.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-10 cursor-pointer transition-colors',
                  uploadFile
                    ? 'border-gold-500/50 bg-gold-500/5'
                    : 'border-forest-400 hover:border-forest-300 hover:bg-forest-800/30',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {uploadFile ? (
                  <>
                    <ImageIcon className="w-8 h-8 text-gold-400 mb-2" />
                    <p className="text-sm text-cream-200 font-500">{uploadFile.name}</p>
                    <p className="text-xs text-cream-500 mt-1">
                      {(uploadFile.size / 1024).toFixed(0)} KB · click to change
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-forest-400 mb-2" />
                    <p className="text-sm text-cream-400">Drop a resume image here</p>
                    <p className="text-xs text-cream-500 mt-1">PNG, JPG or WebP · max 10 MB</p>
                  </>
                )}
              </div>

              <button
                onClick={runAnalyze}
                disabled={!uploadFile || analyzing}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {analyzing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Analyse Style</>}
              </button>

              {analyzeError && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded px-3 py-2">
                  {analyzeError}
                </p>
              )}

              {analyzed && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-cream-400 uppercase tracking-wider">Result</p>
                  <StyleCard
                    preset={analyzed}
                    active={isDraftActive(analyzed)}
                    onSelect={() => selectPreset(analyzed)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Customize ── always visible ── */}
          <div className="mx-5 mb-5 border border-forest-500 rounded-lg p-4 space-y-4 bg-forest-800/30">
            <p className="text-[10px] font-mono text-cream-400 uppercase tracking-wider">Fine-tune</p>

            {/* Accent colour swatches */}
            <div>
              <label className="label">Accent Colour</label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_SWATCHES.map(color => (
                  <button
                    key={color}
                    onClick={() => updateDraftStyle({ accent_color: color })}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                      draftStyle.accent_color === color
                        ? 'border-gold-400 scale-110'
                        : 'border-transparent',
                    )}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
                {/* Custom colour input */}
                <label
                  className="w-6 h-6 rounded-full border-2 border-dashed border-forest-400 hover:border-forest-300 flex items-center justify-center cursor-pointer overflow-hidden"
                  title="Custom colour"
                >
                  <input
                    type="color"
                    className="opacity-0 absolute w-px h-px"
                    value={draftStyle.accent_color || '#1a1a2e'}
                    onChange={e => updateDraftStyle({ accent_color: e.target.value })}
                  />
                  <span className="text-[8px] text-forest-400">+</span>
                </label>
              </div>
            </div>

            {/* Font + Spacing row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Font Style</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FONT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateDraftStyle({ font: opt.value })}
                      className={cn(
                        'text-xs py-1.5 px-2 rounded border transition-colors text-left',
                        draftStyle.font === opt.value
                          ? 'bg-gold-500/15 border-gold-500/50 text-gold-400'
                          : 'border-forest-500 text-cream-500 hover:border-forest-400',
                      )}
                    >
                      <span className="block">{opt.label}</span>
                      <span className="block text-[10px] opacity-60">{opt.example}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Spacing</label>
                <div className="flex flex-col gap-1.5">
                  {SPACING_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateDraftStyle({ spacing: opt.value })}
                      className={cn(
                        'text-xs py-1.5 px-2 rounded border transition-colors text-left',
                        draftStyle.spacing === opt.value
                          ? 'bg-gold-500/15 border-gold-500/50 text-gold-400'
                          : 'border-forest-500 text-cream-500 hover:border-forest-400',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="label">Base Template</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'classic', label: 'Classic', desc: 'Centered serif' },
                  { id: 'modern',  label: 'Modern',  desc: 'Banner header' },
                  { id: 'minimal', label: 'Minimal', desc: 'Sparse & clean' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDraftTemplate(t.id)}
                    className={cn(
                      'text-xs py-2 px-2 rounded border transition-colors text-left',
                      draftTemplate === t.id
                        ? 'bg-gold-500/15 border-gold-500/50 text-gold-400'
                        : 'border-forest-500 text-cream-500 hover:border-forest-400',
                    )}
                  >
                    <span className="block font-500">{t.label}</span>
                    <span className="block text-[10px] opacity-60">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-forest-500 shrink-0">
          {/* Preview of current draft */}
          <div className="flex items-center gap-2">
            {draftStyle.accent_color && (
              <span
                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                style={{ background: draftStyle.accent_color }}
              />
            )}
            <span className="text-xs text-cream-500">
              {draftTemplate} · {draftStyle.font || 'default'} · {draftStyle.spacing || 'normal'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">Cancel</button>
            <button onClick={handleApply} className="btn-primary text-xs">
              <ChevronRight className="w-3.5 h-3.5" />
              Apply Style
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
