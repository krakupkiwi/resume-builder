import { useEffect, useRef, useState } from 'react'
import { RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { previewUrl } from '@/api/ai'

interface Props {
  resumeVersionId?: string
  refreshKey?: number
}

export function DocumentPreview({ resumeVersionId, refreshKey }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useState(0.75)
  const [loading, setLoading] = useState(false)

  const url = resumeVersionId ? previewUrl(resumeVersionId) : null

  useEffect(() => {
    if (!url) return
    setLoading(true)
  }, [url, refreshKey])

  if (!resumeVersionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-forest-900 text-center px-6">
        <div className="w-16 h-20 border-2 border-dashed border-forest-400 rounded flex items-center justify-center mb-4">
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-1 bg-forest-500 rounded" style={{ width: `${30 + i * 6}px` }} />
            ))}
          </div>
        </div>
        <p className="text-sm font-display text-cream-400 italic">No résumé selected</p>
        <p className="text-xs text-cream-500 mt-1">Create or select a résumé version to see the preview</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-forest-900">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-forest-500 h-10 shrink-0">
        <span className="text-xs font-mono text-cream-400 uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="btn-ghost px-2 py-1">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-cream-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="btn-ghost px-2 py-1">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setLoading(true); if (iframeRef.current) iframeRef.current.src = iframeRef.current.src }}
            className="btn-ghost px-2 py-1 ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Document preview area */}
      <div className="flex-1 overflow-auto bg-forest-800 flex justify-center py-6 px-4">
        <div
          className="origin-top transition-transform duration-200 shadow-2xl shadow-forest-950/80"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, maxWidth: `${794 / zoom}px` }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-parchment-50 z-10">
              <RefreshCw className="w-6 h-6 text-ink-700 animate-spin" />
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={url || ''}
            className="w-full bg-parchment-50"
            style={{ height: '1056px', border: 'none' }}
            onLoad={() => setLoading(false)}
            title="Resume Preview"
          />
        </div>
      </div>
    </div>
  )
}
