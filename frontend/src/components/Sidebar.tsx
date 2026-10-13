import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  CheckSquare,
  Cpu,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../lib/auth'

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem('aios-sidebar-collapsed') === 'true')
  }, [])

  function toggleSidebar() {
    setIsCollapsed((collapsed) => {
      const next = !collapsed
      window.localStorage.setItem('aios-sidebar-collapsed', String(next))
      return next
    })
  }

  const navBaseClass =
    `flex items-center gap-3 rounded-full py-3 text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors ${
      isCollapsed ? 'justify-center px-3' : 'w-full px-4'
    }`
  const navActiveClass = 'bg-secondary-container text-on-secondary-fixed font-bold'
  const mobileNavClass = 'flex min-w-18 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container'
  const mobileNavActiveClass = 'bg-secondary-container text-on-secondary-fixed'

  return (
    <>
    <aside className={`relative z-50 hidden h-full shrink-0 flex-col border-r border-[rgba(198,198,205,0.25)] bg-surface-container-low px-5 py-6 shadow-[0_12px_40px_rgba(25,28,30,0.05)] transition-[width] duration-200 lg:flex ${isCollapsed ? 'w-20' : 'w-72'}`}>
      <div className={`mb-8 flex ${isCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-3 px-2'}`}>
        {isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="self-end rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className={`flex items-center gap-3 ${isCollapsed ? '' : 'min-w-0 flex-1'}`}>
          <Link to="/" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90">
            <img src="/image.png" alt="Application logo" className="h-10 w-10 object-contain" />
          </Link>
          {!isCollapsed && <div className="min-w-0">
            <h1 className="font-headline text-lg font-bold leading-tight text-on-surface">Learning Platform</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Intelligence Curator</p>
          </div>}
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="shrink-0 rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className={`flex flex-1 flex-col space-y-1 overflow-y-auto pb-4 pr-1 ${isCollapsed ? 'items-center' : ''}`}>
        {user && (
          <>
            {user.role === 'admin' ? (
              <>
                <Link to="/admin/dashboard" title="Students" className={`${navBaseClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}`} activeProps={{ className: `${navBaseClass} ${navActiveClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}` }}>
                  <LayoutDashboard className="h-4 w-4" />
                  {!isCollapsed && 'Students'}
                </Link>
                <Link to="/admin/teachers" title="Teachers" className={`${navBaseClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}`} activeProps={{ className: `${navBaseClass} ${navActiveClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}` }}>
                  <Users className="h-4 w-4" />
                  {!isCollapsed && 'Teachers'}
                </Link>
              </>
            ) : (
              <>
                {user.role !== 'student' && (
                  <Link to="/dashboard" title="Dashboard" className={`${navBaseClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}`} activeProps={{ className: `${navBaseClass} ${navActiveClass} ${isCollapsed ? 'justify-center px-3' : 'w-full px-4'}` }}>
                    <LayoutDashboard className="h-4 w-4" />
                    {!isCollapsed && 'Dashboard'}
                  </Link>
                )}

                {user.role === 'advisor' && (
                  <Link to="/portal" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && 'Portal'}
                  </Link>
                )}

                {user.role === 'student' && (
                  <>
                    <Link to="/dashboard" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <LayoutDashboard className="h-4 w-4" />
                      {!isCollapsed && 'Dashboard'}
                    </Link>
                    <Link to="/tasks" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <CheckSquare className="h-4 w-4" />
                      {!isCollapsed && 'Tasks'}
                    </Link>
                    <Link to="/resources" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <BookOpen className="h-4 w-4" />
                      {!isCollapsed && 'Resources'}
                    </Link>
                    <Link to="/peers" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <UserPlus className="h-4 w-4" />
                      {!isCollapsed && 'Peer Match'}
                    </Link>
                    <Link to="/chat" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <MessageSquare className="h-4 w-4" />
                      {!isCollapsed && 'Chat'}
                    </Link>
                    <Link to="/forum" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <Users className="h-4 w-4" />
                      {!isCollapsed && 'Forum'}
                    </Link>
                    <Link to="/competitions" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <Trophy className="h-4 w-4" />
                      {!isCollapsed && 'Competitions'}
                    </Link>
                    <Link to="/simulator" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                      <Cpu className="h-4 w-4" />
                      {!isCollapsed && 'Simulator'}
                    </Link>
                  </>
                )}

                {user.role !== 'advisor' && user.role !== 'student' && (
                  <Link to="/tasks" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <CheckSquare className="h-4 w-4" />
                    {!isCollapsed && 'Tasks'}
                  </Link>
                )}

                {user.role !== 'student' && (
                  <Link to="/peers" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <UserPlus className="h-4 w-4" />
                    {!isCollapsed && 'Peer Match'}
                  </Link>
                )}

                {user.role !== 'student' && (
                  <Link to="/simulator" className={navBaseClass} activeProps={{ className: `${navBaseClass} ${navActiveClass}` }}>
                    <Cpu className="h-4 w-4" />
                    {!isCollapsed && 'Simulator'}
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[rgba(198,198,205,0.25)] pb-1 pl-1 pr-2 pt-5">
        {!user && (
          <Link
            to="/login"
            className="mt-1 inline-flex rounded-full bg-secondary-container px-4 py-1.5 text-xs font-bold text-on-secondary-container no-underline transition hover:opacity-90"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
    {user?.role === 'student' && (
      <nav aria-label="Student navigation" className="fixed inset-x-0 bottom-0 z-50 flex gap-1 overflow-x-auto border-t border-[var(--border-subtle)] bg-white/95 px-2 py-1.5 shadow-[0_-8px_24px_rgba(35,55,96,0.08)] backdrop-blur lg:hidden">
        <Link to="/dashboard" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
        <Link to="/tasks" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <CheckSquare className="h-4 w-4" /> Tasks
        </Link>
        <Link to="/resources" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <BookOpen className="h-4 w-4" /> Resources
        </Link>
        <Link to="/peers" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <UserPlus className="h-4 w-4" /> Peers
        </Link>
        <Link to="/chat" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <MessageSquare className="h-4 w-4" /> Chat
        </Link>
        <Link to="/forum" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <Users className="h-4 w-4" /> Forum
        </Link>
        <Link to="/competitions" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <Trophy className="h-4 w-4" /> Compete
        </Link>
        <Link to="/simulator" className={mobileNavClass} activeProps={{ className: `${mobileNavClass} ${mobileNavActiveClass}` }}>
          <Cpu className="h-4 w-4" /> Simulator
        </Link>
      </nav>
    )}
    </>
  )
}
