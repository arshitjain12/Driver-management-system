import { useState, useEffect } from 'react'
import { MapPin, Clock, Car, Phone, CheckCircle, Star, AlertCircle, Loader2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  weekday:'short', day:'numeric', month:'short',
  hour:'2-digit', minute:'2-digit'
}) : '—'

export default function GuestDashboard() {
  const { user }                  = useAuth()
  const [data, setData]           = useState(null)
  const [pending, setPending]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [readyLoading, setReady]  = useState(null)  // tripId
  const [readyDone, setReadyDone] = useState([])    // tripIds already notified

  const load = async () => {
    try {
      const [bookRes, rateRes] = await Promise.all([
        api.get('/trips/my-bookings'),
        api.get('/ratings/pending'),
      ])
      setData(bookRes.data.data)
      setPending(rateRes.data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── "Main Bahar Hun" button ────────────────────────
  const handleGuestReady = async (tripId) => {
    setReady(tripId)
    try {
      const { data: res } = await api.patch(`/dispatch/guest-ready/${tripId}`)
      setReadyDone(p => [...p, tripId])
      alert(res.message || 'Driver ko notify kar diya!')
    } catch(err) {
      alert(err.response?.data?.message || 'Error notifying driver')
    } finally {
      setReady(null)
    }
  }

  const upcoming = data?.upcoming || []
  const past     = data?.past     || []
  const next     = upcoming[0]

  // Show "Main Bahar Hun" only for assigned/acknowledged/delayed trips
  const canShowReadyButton = (status) =>
    ['assigned', 'acknowledged', 'delayed'].includes(status)

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-28 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="page-sub">
          {user?.company ? `${user.company} · ` : ''}{user?.category} Guest
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Upcoming"        value={upcoming.length} icon={Clock}       color="brand"   />
        <StatCard title="Past Trips"      value={past.length}     icon={CheckCircle} color="emerald" />
        <StatCard title="Pending Ratings" value={pending.length}  icon={Star}        color="amber"   />
      </div>

      {/* Next trip */}
      {next ? (
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3">Aapki Agle Trip</h2>
          <div className="card p-5 border-l-4 border-brand-500 fade-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-1">Scheduled</p>
                <p className="text-lg font-bold text-slate-800 font-mono">{fmt(next.scheduledAt)}</p>
              </div>
              <Badge status={next.status} />
            </div>

            {/* Driver info */}
            {next.driver && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold flex-shrink-0">
                  {next.driver.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{next.driver.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {next.driver.vehicleNumber || '—'} · {next.driver.vehicleType}
                    </span>
                    <a href={`tel:${next.driver.phone}`}
                      className="text-xs text-brand-500 flex items-center gap-1 hover:underline">
                      <Phone className="w-3 h-3" />{next.driver.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Route */}
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">{next.pickupLocation?.address}</p>
              </div>
              <div className="ml-1 h-4 border-l-2 border-dashed border-slate-200" />
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">{next.dropLocation?.address}</p>
              </div>
            </div>

            {next.travelNumber && (
              <p className="text-xs text-slate-400 font-mono mb-4">
                {next.travelMode?.toUpperCase()} · {next.travelNumber}
              </p>
            )}

            {/* ── "Main Bahar Hun" Button ───────────── */}
            {canShowReadyButton(next.status) && (
              <div className="mt-2">
                {readyDone.includes(next._id) ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-emerald-600">
                      Driver ko notify kar diya — woh aa raha hai!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Jab aap airport/station se bahar nikal aao — driver ko notify karo
                      </p>
                    </div>
                    <button
                      onClick={() => handleGuestReady(next._id)}
                      disabled={readyLoading === next._id}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all active:scale-[.98] disabled:opacity-60"
                    >
                      {readyLoading === next._id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Notifying…</>
                        : '🟢 Main Bahar Hun — Driver Ko Bulao'
                      }
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card py-12 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-8 h-8" />
          <p className="text-sm">Koi upcoming trip nahi</p>
          <a href="/guest/request"
            className="mt-2 text-xs text-brand-500 font-semibold hover:underline">
            + Trip Request Karo
          </a>
        </div>
      )}

      {/* Pending ratings */}
      {pending.length > 0 && (
        <div className="card p-4 flex items-center gap-3 border border-amber-100 bg-amber-50 fade-up">
          <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">
              {pending.length} trip{pending.length > 1 ? 's' : ''} rate karni hain
            </p>
            <p className="text-xs text-amber-500">
              Feedback se driver improve karta hai
            </p>
          </div>
          <a href="/guest/ratings"
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2">
            Rate karo →
          </a>
        </div>
      )}
    </div>
  )
}
