import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Car, Users, MapPin, CalendarOff,
  BarChart2, ClipboardList, History, Star, LogOut, Zap,
} from 'lucide-react'


const NAV = {
  admin: [
    { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/drivers',   icon: Car,             label: 'Drivers' },
    { to: '/admin/guests',    icon: Users,           label: 'Guests' },
    { to: '/admin/trips',     icon: MapPin,          label: 'Trips' },
    { to: '/admin/leaves',    icon: CalendarOff,     label: 'Leave Requests' },
    { to: '/admin/reports',   icon: BarChart2,       label: 'Reports' },
  ],
  driver: [
    { to: '/driver',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/driver/trips',    icon: ClipboardList,   label: 'My Trips' },
    { to: '/driver/leaves',   icon: CalendarOff,     label: 'Leave Requests' },
    { to: '/driver/ratings',  icon: Star,            label: 'My Ratings' },
    { to: '/driver/history',  icon: History,         label: 'History' },
  ],
  guest: [
    { to: '/guest',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/guest/trips',     icon: MapPin,          label: 'My Trips' },
    { to: '/guest/history',   icon: History,         label: 'History' },
    { to: '/guest/ratings',   icon: Star,            label: 'Rate a Trip' },
  ],
}

const roleLabel  = { admin: 'Administrator', driver: 'Driver Portal', guest: 'Guest Portal' }
const roleColors = {
  admin:  'bg-brand-500',
  driver: 'bg-emerald-500',
  guest:  'bg-amber-500',
}
const roleInitial = { admin: 'A', driver: 'D', guest: 'G' }

const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV[user?.role] || []

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-30">


      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">FleetManager</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{roleLabel[user?.role]}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split('/').length <= 2}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive
                 ? 'nav-active text-brand-600 border-l-4 border-brand-500 pl-[8px] font-semibold'
                 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-l-4 border-transparent pl-[8px]'
               }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

     
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className={`w-8 h-8 rounded-xl ${roleColors[user?.role]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {user?.name?.[0]?.toUpperCase() || roleInitial[user?.role]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
