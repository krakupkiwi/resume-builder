export function SettingsPage() {
  return (
    <div className="h-full overflow-auto p-6 animate-fade-in">
      <div className="max-w-xl mx-auto">
        <p className="text-xs font-mono text-gold-500 uppercase tracking-widest mb-1">Settings</p>
        <h1 className="font-display text-2xl text-cream-100 mb-6">Configuration</h1>

        <div className="panel rounded-lg p-5 space-y-5">
          <div>
            <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-3">AI Provider</h2>
            <p className="text-xs text-cream-500 leading-relaxed">
              AI provider is configured via environment variables on the server.
              Set <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">AI_PROVIDER</code> to{' '}
              <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">claude</code>,{' '}
              <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">openai</code>, or{' '}
              <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">ollama</code>{' '}
              in your <code className="font-mono bg-forest-700 px-1 rounded text-gold-400">.env</code> file.
            </p>
          </div>

          <div className="section-divider" />

          <div>
            <h2 className="text-xs font-mono text-cream-400 uppercase tracking-wider mb-3">About</h2>
            <p className="text-xs text-cream-500">Resume Builder v1.0.0 — Self-hosted, Docker-first career tools.</p>
            <p className="text-xs text-cream-500 mt-1">All AI suggestions are grounded in your real experience. Nothing is fabricated.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
