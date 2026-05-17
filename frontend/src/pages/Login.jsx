import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Car, UserCircle, Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react'

const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    sub: 'Full system control',
    icon: Shield,
    color: 'group-hover:text-brand-600',
    activeBg: 'bg-brand-500',
    activeRing: 'ring-brand-200',
    iconBg: 'bg-brand-50 text-brand-500',
    selectedBg: 'bg-brand-500',
    dot: 'bg-brand-400',
  },
  {
    key: 'driver',
    label: 'Driver',
    sub: 'Manage your trips',
    icon: Car,
    color: 'group-hover:text-emerald-600',
    iconBg: 'bg-emerald-50 text-emerald-500',
    activeRing: 'ring-emerald-200',
    selectedBg: 'bg-emerald-500',
    dot: 'bg-emerald-400',
  },
  {
    key: 'guest',
    label: 'Guest',
    sub: 'View your bookings',
    icon: UserCircle,
    color: 'group-hover:text-amber-600',
    iconBg: 'bg-amber-50 text-amber-500',
    activeRing: 'ring-amber-200',
    selectedBg: 'bg-amber-500',
    dot: 'bg-amber-400',
  },
]

const REDIRECT = { admin: '/admin', driver: '/driver', guest: '/guest' }

export default function Login() {
  const [role, setRole]         = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const selected = ROLES.find(r => r.key === role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) return
    setLoading(true); setError('')
    try {
      const user = await login(email, password)
      navigate(REDIRECT[user.role] || '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

   
      <div className="hidden lg:flex w-[52%] relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%)' }}>

       
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full opacity-5 bg-white" />

       
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-center px-16">
        
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">FleetManager</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Manage drivers.<br />
            <span className="text-brand-200">Effortlessly.</span>
          </h1>
          <p className="mt-4 text-brand-200/70 text-base leading-relaxed max-w-xs">
            A unified platform to coordinate drivers, guests, and trips — all in one place.
          </p>

     
          <ul className="mt-10 space-y-3">
            {['Real-time trip tracking', 'Smart driver assignment', 'Instant delay & cancel alerts', 'Guest ratings & reviews'].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

   
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">

         
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-slate-800 font-bold text-base">FleetManager</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="text-sm text-slate-400 mt-1">Choose your role </p>

        
          <div className="grid grid-cols-3 gap-3 mt-7">
            {ROLES.map(r => {
              const Icon = r.icon
              const isSelected = role === r.key
              return (
                <button
                  key={r.key}
                  onClick={() => { setRole(r.key); setError('') }}
                  className={`group relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-200
                    ${isSelected
                      ? `border-transparent ring-4 ${r.activeRing} ${r.selectedBg}`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-card'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/60" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                    ${isSelected ? 'bg-white/20' : r.iconBg}`}>
                    <Icon className={`w-5 h-5 transition-colors ${isSelected ? 'text-white' : ''}`} strokeWidth={2} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold text-center ${isSelected ? 'text-white' : 'text-slate-700'}`}>{r.label}</p>
                    <p className={`text-[10px] text-center leading-tight mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{r.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Login form ─────────────────────────── */}
          {role && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 fade-up">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder={`${role}@company.com`}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white
                  transition-all duration-150 active:scale-[.98] disabled:opacity-60
                  ${selected?.selectedBg || 'bg-brand-500'} hover:opacity-90 shadow-sm`}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                  : <>Sign in as {selected?.label} <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          )}

          {!role && (
            <p className="text-xs text-center text-slate-400 mt-6">
              Select a role above to proceed
            </p>
          )}

          <p className="text-xs text-center text-slate-300 mt-8">
            Made With love By Arshit Jain
          </p>
        </div>
      </div>
    </div>
  )
}
