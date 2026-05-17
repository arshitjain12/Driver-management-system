import { useState, useEffect } from 'react'
import { MapPin, Clock, CheckCircle, AlertTriangle, Car, User, Navigation } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

const STATUS_FLOW = {
  assigned:    { next: 'acknowledged', label: 'Acknowledge Trip',  color: 'bg-brand-500' },
  acknowledged:{ next: 'en_route',     label: '🚗 Start Driving',  color: 'bg-violet-500' },
  en_route:    { next: 'arrived',      label: '📍 Mark Arrived',   color: 'bg-amber-500'  },
  arrived:     { next: 'in_progress',  label: '✅ Trip Started',   color: 'bg-orange-500' },
  in_progress: { next: 'completed',    label: '🏁 Complete Trip',  color: 'bg-emerald-500'},
}

export default function DriverDashboard() {
  const { user }              = useAuth()
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.get('/trips/my-trips', { params: { date: today } })
      setTrips(data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (tripId, status) => {
    setUpdating(tripId)
    try {
      await api.patch(`/trips/${tripId}/status`, { status })
      load()
    } catch (e) { alert(e.response?.data?.message || 'Error') }
    finally { setUpdating(null) }
  }

  const stats = {
    total:     trips.length,
    completed: trips.filter(t => t.status === 'completed').length,
    ongoing:   trips.filter(t => ['en_route','arrived','in_progress'].includes(t.status)).length,
    upcoming:  trips.filter(t => ['assigned','acknowledged'].includes(t.status)).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} </h1>
        <p className="page-sub">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
      </div>

      
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Trips"  value={stats.total}     icon={MapPin}       color="brand"   />
        <StatCard title="Completed"      value={stats.completed} icon={CheckCircle}  color="emerald" />
        <StatCard title="Ongoing"        value={stats.ongoing}   icon={Navigation}   color="violet"  />
        <StatCard title="Upcoming"       value={stats.upcoming}  icon={Clock}        color="amber"   />
      </div>

     
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Today's Schedule</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
        ) : trips.length === 0 ? (
          <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
            <Car className="w-10 h-10" />
            <p className="text-sm">No trips scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => {
              const flow = STATUS_FLOW[trip.status]
              return (
                <div key={trip._id} className="card p-5 fade-up">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 font-mono">{fmt(trip.scheduledAt)}</span>
                      {trip.travelNumber && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                          {trip.travelMode?.toUpperCase()} · {trip.travelNumber}
                        </span>
                      )}
                    </div>
                    <Badge status={trip.status} />
                  </div>

                
                  <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                      {trip.guest?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{trip.guest?.name}</p>
                      <p className="text-xs text-slate-400">{trip.guest?.phone} · {trip.guest?.category}</p>
                    </div>
                  </div>

                
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">{trip.pickupLocation?.address}</p>
                    </div>
                    <div className="ml-1 border-l-2 border-dashed border-slate-200 h-3" />
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">{trip.dropLocation?.address}</p>
                    </div>
                  </div>

                  
                  {trip.guest?.specialNeeds && (
                    <div className="mb-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-700">⚠️ Special needs: {trip.guest.specialNeeds}</p>
                    </div>
                  )}

                 
                  {flow && (
                    <button
                      onClick={() => updateStatus(trip._id, flow.next)}
                      disabled={updating === trip._id}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[.98] disabled:opacity-60 ${flow.color}`}
                    >
                      {updating === trip._id ? 'Updating…' : flow.label}
                    </button>
                  )}

                  {trip.status === 'completed' && (
                    <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 text-center border border-emerald-100">
                      ✅ Trip Completed
                    </div>
                  )}

                  {trip.notes && (
                    <p className="text-xs text-slate-400 mt-3 italic">Note: {trip.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
