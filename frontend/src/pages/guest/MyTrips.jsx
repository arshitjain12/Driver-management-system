import { useState, useEffect } from 'react'
import { MapPin, Car, Phone } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

const TripCard = ({ trip }) => (
  <div className="card p-5 fade-up">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-sm font-bold text-slate-700 font-mono">{fmt(trip.scheduledAt)}</p>
        {trip.travelNumber && (
          <p className="text-xs text-slate-400 font-mono mt-0.5">{trip.travelMode?.toUpperCase()} · {trip.travelNumber}</p>
        )}
      </div>
      <Badge status={trip.status} />
    </div>


    {trip.driver && (
      <div className="flex items-center gap-2 mb-3 p-2.5 bg-slate-50 rounded-xl">
        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 font-bold text-xs flex-shrink-0">
          {trip.driver.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700">{trip.driver.name}</p>
          <p className="text-[10px] text-slate-400">{trip.driver.vehicleNumber} · {trip.driver.vehicleType}</p>
        </div>
        <a href={`tel:${trip.driver.phone}`} className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-500 transition-colors">
          <Phone className="w-3.5 h-3.5" />
        </a>
      </div>
    )}

    
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
        <p className="text-xs text-slate-600">{trip.pickupLocation?.address}</p>
      </div>
      <div className="ml-0.5 h-3 border-l-2 border-dashed border-slate-200" />
      <div className="flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
        <p className="text-xs text-slate-600">{trip.dropLocation?.address}</p>
      </div>
    </div>

    {(trip.delayReason || trip.cancelReason) && (
      <div className="mt-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700">
          {trip.delayReason ? `⏰ Delayed: ${trip.delayReason}` : `❌ Cancelled: ${trip.cancelReason}`}
        </p>
      </div>
    )}
  </div>
)

export default function GuestMyTrips() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('upcoming')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get('/trips/my-bookings')
        setData(res.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const list = tab === 'upcoming' ? (data?.upcoming || []) : (data?.past || [])

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">My Trips</h1><p className="page-sub">Upcoming and past bookings</p></div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key:'upcoming', label:`Upcoming (${data?.upcoming?.length ?? 0})` },
          { key:'past',     label:`Past (${data?.past?.length ?? 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${tab === t.key ? 'bg-brand-50 text-brand-600 border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-10 h-10" />
          <p className="text-sm">No {tab} trips</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(trip => <TripCard key={trip._id} trip={trip} />)}
        </div>
      )}
    </div>
  )
}
