import { useState, useEffect } from 'react'
import { MapPin, Clock, Car, Phone, CheckCircle, Star } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

export default function GuestDashboard() {
  const { user }              = useAuth()
  const [data, setData]       = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    load()
  }, [])

  const upcoming = data?.upcoming || []
  const past     = data?.past     || []
  const next     = upcoming[0]

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-28 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} </h1>
        <p className="page-sub">{user?.company ? `${user.company} · ` : ''}{user?.category} Guest</p>
      </div>


      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Upcoming Trips" value={upcoming.length} icon={Clock}        color="brand"   />
        <StatCard title="Past Trips"     value={past.length}     icon={CheckCircle}  color="emerald" />
        <StatCard title="Pending Ratings"value={pending.length}  icon={Star}         color="amber"   />
      </div>

  
      {next ? (
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3">Your Next Trip</h2>
          <div className="card p-5 border-l-4 border-brand-500 fade-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-1">Scheduled</p>
                <p className="text-lg font-bold text-slate-800 font-mono">{fmt(next.scheduledAt)}</p>
              </div>
              <Badge status={next.status} />
            </div>

       
            {next.driver && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold flex-shrink-0">
                  {next.driver.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{next.driver.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Car className="w-3 h-3" />{next.driver.vehicleNumber || '—'} · {next.driver.vehicleType}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{next.driver.phone}
                    </span>
                  </div>
                </div>
              </div>
            )}

          
            <div className="space-y-2">
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
              <p className="text-xs text-slate-400 mt-3 font-mono">
                {next.travelMode?.toUpperCase()} · {next.travelNumber}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="card py-12 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-8 h-8" />
          <p className="text-sm">No upcoming trips scheduled</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="card p-4 flex items-center gap-3 border border-amber-100 bg-amber-50 fade-up">
          <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">
              You have {pending.length} trip{pending.length > 1 ? 's' : ''} to rate
            </p>
            <p className="text-xs text-amber-500">Your feedback helps improve driver service</p>
          </div>
          <a href="/guest/ratings" className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2">
            Rate now →
          </a>
        </div>
      )}
    </div>
  )
}
