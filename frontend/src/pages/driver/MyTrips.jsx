import { useState, useEffect } from 'react'
import { MapPin, Clock, RefreshCw } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

const STATUS_FLOW = {
  assigned:    { next: 'acknowledged', label: 'Acknowledge' },
  acknowledged:{ next: 'en_route',     label: 'Start Driving' },
  en_route:    { next: 'arrived',      label: 'Mark Arrived' },
  arrived:     { next: 'in_progress',  label: 'Trip Started' },
  in_progress: { next: 'completed',    label: 'Complete' },
}

const STATUS_OPTS = ['assigned','acknowledged','en_route','arrived','in_progress','completed','delayed','cancelled']

export default function DriverMyTrips() {
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [updating, setUpdating] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.status = filter
      const { data } = await api.get('/trips/my-trips', { params })
      setTrips(data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const updateStatus = async (tripId, status) => {
    setUpdating(tripId)
    try {
      await api.patch(`/trips/${tripId}/status`, { status })
      load()
    } catch (e) { alert(e.response?.data?.message || 'Error') }
    finally { setUpdating(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">My Trips</h1><p className="page-sub">All your assigned trips</p></div>
        <button className="btn-secondary" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!filter ? 'bg-brand-50 text-brand-600 border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
          All
        </button>
        {['assigned','en_route','in_progress','completed','cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === s ? 'bg-brand-50 text-brand-600 border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {s.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : trips.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-10 h-10" /><p className="text-sm">No trips found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(trip => {
            const flow = STATUS_FLOW[trip.status]
            return (
              <div key={trip._id} className="card p-5 fade-up">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700 font-mono">{fmt(trip.scheduledAt)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{trip.guest?.name} · {trip.guest?.category}</p>
                  </div>
                  <Badge status={trip.status} />
                </div>

                <div className="space-y-1 mb-3">
                  <p className="text-xs text-slate-500">📍 {trip.pickupLocation?.address}</p>
                  <p className="text-xs text-slate-400 pl-4">→ {trip.dropLocation?.address}</p>
                </div>

                {trip.travelNumber && (
                  <p className="text-xs text-slate-400 mb-3 font-mono">
                    {trip.travelMode?.toUpperCase()} · {trip.travelNumber}
                  </p>
                )}

                {flow && (
                  <button
                    onClick={() => updateStatus(trip._id, flow.next)}
                    disabled={updating === trip._id}
                    className="btn-primary text-xs disabled:opacity-60"
                  >
                    {updating === trip._id ? 'Updating…' : flow.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
