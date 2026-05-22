import { useState, useEffect, useRef } from 'react'
import { MapPin, Clock, CheckCircle, AlertTriangle, Car, Navigation, WifiOff, Wifi, AlertCircle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'

const STATUS_FLOW = {
  assigned:    { next: 'acknowledged', label: 'Acknowledge Trip',  color: 'bg-brand-500'   },
  acknowledged:{ next: 'en_route',     label: '🚗 Start Driving',  color: 'bg-violet-500'  },
  en_route:    { next: 'arrived',      label: '📍 Mark Arrived',   color: 'bg-amber-500'   },
  arrived:     { next: 'in_progress',  label: '✅ Trip Started',   color: 'bg-orange-500'  },
  in_progress: { next: 'completed',    label: '🏁 Complete Trip',  color: 'bg-emerald-500' },
}

const ISSUE_TYPES = [
  { key: 'vehicle_problem', label: '🔧 Vehicle Problem' },
  { key: 'not_in_area',     label: '📍 Not in Area'    },
  { key: 'medical',         label: '🏥 Medical Emergency' },
  { key: 'other',           label: '❓ Other'           },
]

export default function DriverDashboard() {
  const { user }                      = useAuth()
  const [trips, setTrips]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [updating, setUpdating]       = useState(null)
  const [issueTrip, setIssueTrip]     = useState(null)
  const [issueForm, setIssueForm]     = useState({ issueType: 'vehicle_problem', reason: '' })
  const [isTracking, setIsTracking]   = useState(false)
  const [gpsStatus, setGpsStatus]     = useState('idle')  
  const watchIdRef                    = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await api.get('/trips/my-trips', { params: { date: today } })
      setTrips(data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (tripId, status) => {
    setUpdating(tripId)
    try { await api.patch(`/trips/${tripId}/status`, { status }); load() }
    catch(e) { alert(e.response?.data?.message || 'Error') }
    finally { setUpdating(null) }
  }


  const handleIssueSubmit = async () => {
    if (!issueTrip || !issueForm.reason) return
    try {
      await api.post(`/dispatch/issue/${issueTrip._id}`, issueForm)
      setIssueTrip(null)
      setIssueForm({ issueType: 'vehicle_problem', reason: '' })
      alert('Issue reported. Admin has been notified.')
    } catch(e) { alert(e.response?.data?.message || 'Error') }
  }


  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error'); return
    }
    setGpsStatus('tracking'); setIsTracking(true)


const sendLocation = () => {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await api.post('/location/update', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      } catch(e) { console.error('Location update failed', e) }
    },
    () => setGpsStatus('error'),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }

  )
}


sendLocation()


watchIdRef.current = setInterval(sendLocation, 5000)
  }


const stopTracking = () => {
  if (watchIdRef.current) clearInterval(watchIdRef.current)

  watchIdRef.current = null
  setIsTracking(false)
  setGpsStatus('idle')
}
  useEffect(() => () => stopTracking(), [])

  const stats = {
    total:     trips.length,
    completed: trips.filter(t => t.status === 'completed').length,
    ongoing:   trips.filter(t => ['en_route','arrived','in_progress'].includes(t.status)).length,
    upcoming:  trips.filter(t => ['assigned','acknowledged'].includes(t.status)).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-sub">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>

        {/* GPS Toggle */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
            ${isTracking
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
        >
          {gpsStatus === 'error'
            ? <><WifiOff className="w-4 h-4 text-red-400" /> GPS Error</>
            : isTracking
              ? <><Wifi className="w-4 h-4 animate-pulse" /> Sharing Location</>
              : <><Navigation className="w-4 h-4" /> Share Location</>
          }
        </button>
      </div>

      {gpsStatus === 'tracking' && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          Live location active — admin can see you on map
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Trips"  value={stats.total}     icon={MapPin}       color="brand"   />
        <StatCard title="Completed"      value={stats.completed} icon={CheckCircle}  color="emerald" />
        <StatCard title="Ongoing"        value={stats.ongoing}   icon={Navigation}   color="violet"  />
        <StatCard title="Upcoming"       value={stats.upcoming}  icon={Clock}        color="amber"   />
      </div>

      {/* Trip cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Today's Schedule</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
        ) : trips.length === 0 ? (
          <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
            <Car className="w-10 h-10" /><p className="text-sm">No trips today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => {
              const flow = STATUS_FLOW[trip.status]
              return (
                <div key={trip._id} className="card p-5 fade-up">
                  <div className="flex items-start justify-between mb-3">
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

                  {/* Guest */}
                  <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                      {trip.guest?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{trip.guest?.name}</p>
                      <p className="text-xs text-slate-400">{trip.guest?.phone} · {trip.guest?.category}</p>
                    </div>
                  </div>

                  {/* Route */}
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
                      <p className="text-xs text-amber-700">⚠️ {trip.guest.specialNeeds}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {flow && (
                      <button onClick={() => updateStatus(trip._id, flow.next)}
                        disabled={updating === trip._id}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[.98] disabled:opacity-60 ${flow.color}`}>
                        {updating === trip._id ? 'Updating…' : flow.label}
                      </button>
                    )}

                    {/* Issue Report button */}
                    {!['completed','cancelled'].includes(trip.status) && (
                      <button onClick={() => setIssueTrip(trip)}
                        className="px-3 py-2.5 rounded-xl bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 transition-colors"
                        title="Report issue">
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    )}

                    {trip.status === 'completed' && (
                      <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 text-center border border-emerald-100">
                        ✅ Completed
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Issue Report Modal */}
      <Modal open={!!issueTrip} onClose={() => setIssueTrip(null)} title="⚠️ Report Issue">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Admin will be notified and may reassign this trip.</p>
          <div>
            <label className="label">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map(t => (
                <button key={t.key} onClick={() => setIssueForm(p=>({...p,issueType:t.key}))}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all
                    ${issueForm.issueType === t.key
                      ? 'bg-brand-50 text-brand-600 border-brand-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Details</label>
            <textarea className="input resize-none" rows={3} required
              value={issueForm.reason}
              onChange={e => setIssueForm(p=>({...p,reason:e.target.value}))}
              placeholder="Describe the issue…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => setIssueTrip(null)}>Cancel</button>
            <button className="btn-danger flex-1" onClick={handleIssueSubmit} disabled={!issueForm.reason}>
              Report Issue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
