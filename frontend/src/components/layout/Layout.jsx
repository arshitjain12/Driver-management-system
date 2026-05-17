import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import useSocket from '../../hooks/useSocket'
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react'


const ICONS = {
  trip_assigned:       { icon: CheckCircle,    color: 'text-emerald-500' },
  trip_delayed:        { icon: AlertTriangle,  color: 'text-amber-500' },
  trip_cancelled:      { icon: X,              color: 'text-red-500' },
  trip_status_updated: { icon: Info,           color: 'text-blue-500' },
  leave_submitted:     { icon: Bell,           color: 'text-brand-500' },
  leave_reviewed:      { icon: CheckCircle,    color: 'text-emerald-500' },
}

const Toast = ({ notifications, onDismiss }) => {
  if (!notifications.length) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {notifications.map((n) => {
        const cfg = ICONS[n.event] || { icon: Info, color: 'text-slate-500' }
        const Icon = cfg.icon
        return (
          <div key={n.id} className="card p-3.5 flex items-start gap-3 shadow-card-lg fade-up">
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
            <p className="text-xs text-slate-600 flex-1 leading-relaxed">{n.message}</p>
            <button onClick={() => onDismiss(n.id)} className="text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}


const Layout = () => {
  const [notifications, setNotifications] = useState([])

  const addNotif = (event) => (data) => {
    const id = Date.now()
    setNotifications(p => [...p, { id, event, message: data.message }])
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 5000)
  }

  const SOCKET_EVENTS = [
    'trip_assigned', 'trip_delayed', 'trip_cancelled',
    'trip_status_updated', 'leave_submitted', 'leave_reviewed',
  ]


  const handlers = Object.fromEntries(SOCKET_EVENTS.map(e => [e, addNotif(e)]))
  useSocket(handlers)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <Toast notifications={notifications} onDismiss={(id) => setNotifications(p => p.filter(n => n.id !== id))} />
    </div>
  )
}

export default Layout
