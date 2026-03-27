import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/resume', icon: FileText, label: 'Résumé' },
  { to: '/jobs', icon: Briefcase, label: 'Applications' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-forest-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-forest-500 bg-forest-900 transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-52'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-forest-500 h-14">
          <div className="flex-shrink-0 w-6 h-6 rounded bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          </div>
          {!collapsed && (
            <span className="font-display text-base text-gold-400 tracking-wide whitespace-nowrap">
              Résumé
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'nav-item',
                  active && 'active',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-forest-500 text-cream-500 hover:text-cream-300 hover:bg-forest-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
