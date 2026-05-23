import { useState, useEffect, useRef } from 'react'
import { MapPin, Clock, CheckCircle, Car, Navigation, WifiOff, Wifi, AlertCircle, Calendar } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', {
  hour: '2-digit', minute: '2-digit'
}) : '—'

const fmtFull = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
}) : '—'

const STATUS_FLOW = {
  assigned:    { next: 'acknowledged', label: 'Acknowledge Trip',  color: 'bg-brand-500'   },
  acknowledged:{ next: 'en_route',     label: '🚗 Start Driving',  color: 'bg-violet-500'  },
  en_route:    { next: 'arrived',      label: '📍 Mark Arrived',   color: 'bg-amber-500'   },
  arrived:     { next: 'in_progress',  label: '✅ Trip Started',   color: 'bg-orange-500'  },
  in_progress: { next: 'completed',    label: '🏁 Complete Trip',  color: 'bg-emerald-500' },
}

const ISSUE_TYPES = [
  { key: 'vehicle_problem', label: '🔧 Vehicle Problem'    },
  { key: 'not_in_area',     label: '📍 Not in Area'        },
  { key: 'medical',         label: '🏥 Medical Emergency'  },
  { key: 'other',           label: '❓ Other'              },
]

// ── Trip Timeline Component ───────────────────────────
const TripTimeline = ({ trip }) => {
  const steps = [
    {
      time:  trip.driverDepartureTime,
      label: 'Driver Nikle',
      icon:  '🚗',
      color: 'bg-brand-400',
      done:  ['en_route','arrived','in_progress','completed'].includes(trip.status),
    },
    {
      time:  trip.estimatedPickupTime,
      label: 'Pickup Location Pe Pohoncho',
      icon:  '📍',
      color: 'bg-amber-400',
      done:  ['arrived','in_progress','completed'].includes(trip.status),
    },
    {
      time:  trip.estimatedBoardTime,
      label: `Guest Board Kare${trip.airportWaitMins ? ` (~${trip.airportWaitMins} min wait)` : ''}`,
      icon:  '👤',
      color: 'bg-orange-400',
      done:  ['in_progress','completed'].includes(trip.status),
    },
    {
      time:  trip.estimatedDropTime,
      label: 'Drop Location',
      icon:  '🏁',
      color: 'bg-violet-400',
      done:  ['completed'].includes(trip.status),
    },
    {
      time:  trip.estimatedFreeTime,
      label: 'Driver Free',
      icon:  '✅',
      color: 'bg-emerald-400',
      done:  trip.status === 'completed',
    },
  ].filter(s => s.time)  // sirf wahi dikhao jo set hain

  if (!steps.length) return null

  return (
    <div className="mt-4 px-3 py-4 bg-slate-50 rounded-2xl border border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
        Trip Timeline
      </p>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs
                ${step.done ? step.color : 'bg-slate-200'} transition-colors`}>
                {step.icon}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-4 mt-1 ${step.done ? 'bg-slate-300' : 'bg-slate-100'}`} />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-semibold ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className={`text-xs font-mono flex-shrink-0 font-bold
                  ${step.done ? 'text-slate-600' : 'text-slate-400'}`}>
                  {fmtTime(step.time)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Duration summary */}
      {trip.driverToPickupMins && trip.pickupToDropMins && (
        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2">
          {[
            { label: 'Drive to pickup', value: `${trip.driverToPickupMins} min` },
            { label: 'Trip duration',   value: `${trip.pickupToDropMins} min`  },
            { label: 'Airport wait',    value: `${trip.airportWaitMins || 0} min` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] text-slate-400">{s.label}</p>
              <p className="text-xs font-bold font-mono text-slate-600">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Departure Alert ────────────────────────────────────
const DepartureAlert = ({ trip }) => {
  const [minutesLeft, setMinutesLeft] = useState(null)

  useEffect(() => {
    if (!trip.driverDepartureTime) return
    const calc = () => {
      const diff = (new Date(trip.driverDepartureTime) - new Date()) / 60000
      setMinutesLeft(Math.round(diff))
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [trip.driverDepartureTime])

  if (!trip.driverDepartureTime) return null
  if (['en_route','arrived','in_progress','completed','cancelled'].includes(trip.status)) return null

  if (minutesLeft === null) return null

  if (minutesLeft < 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-200 mb-3">
        <span className="text-lg">🚨</span>
        <div>
          <p className="text-xs font-bold text-red-600">Ab Niklo! Already late ho</p>
          <p className="text-[10px] text-red-400">
            Nikalne ka time tha: {fmtTime(trip.driverDepartureTime)}
          </p>
        </div>
      </div>
    )
  }

  if (minutesLeft <= 15) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-xl border border-amber-200 mb-3">
        <span className="text-lg">⏰</span>
        <div>
          <p className="text-xs font-bold text-amber-700">
            {minutesLeft} minute mein nikalna hai!
          </p>
          <p className="text-[10px] text-amber-500">
            Pickup time: {fmtTime(trip.estimatedPickupTime)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100 mb-3">
      <span className="text-lg">🕐</span>
      <div>
        <p className="text-xs font-semibold text-blue-700">
          Nikalne ka time: {fmtTime(trip.driverDepartureTime)}
        </p>
        <p className="text-[10px] text-blue-400">
          {minutesLeft} minute baad — Free: {fmtTime(trip.estimatedFreeTime)}
        </p>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────
export default function DriverDashboard() {
  const { user }                    = useAuth()
  const [trips, setTrips]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState(null)
  const [issueTrip, setIssueTrip]   = useState(null)
  const [issueForm, setIssueForm]   = useState({ issueType:'vehicle_problem', reason:'' })
  const [isTracking, setIsTracking] = useState(false)
  const [gpsStatus, setGpsStatus]   = useState('idle')
  const watchIdRef                  = useRef(null)

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
    try {
      await api.patch(`/trips/${tripId}/status`, { status })
      load()
    } catch(e) { alert(e.response?.data?.message || 'Error') }
    finally { setUpdating(null) }
  }

  const handleIssueSubmit = async () => {
    if (!issueTrip || !issueForm.reason) return
    try {
      await api.post(`/dispatch/issue/${issueTrip._id}`, issueForm)
      setIssueTrip(null)
      setIssueForm({ issueType:'vehicle_problem', reason:'' })
      alert('Issue reported. Admin notified.')
    } catch(e) { alert(e.response?.data?.message || 'Error') }
  }

  // ── GPS Tracking ───────────────────────────────────
  const startTracking = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return }
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},&nbsp;
            {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-sub">
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>

        {/* GPS Toggle */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
            ${isTracking
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
          {gpsStatus === 'error'
            ? <><WifiOff className="w-4 h-4 text-red-400" /> GPS Error</>
            : isTracking
              ? <><Wifi className="w-4 h-4 animate-pulse" /> Location ON</>
              : <><Navigation className="w-4 h-4" /> Share Location</>
          }
        </button>
      </div>

      {/* GPS active banner */}
      {isTracking && (
        <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          Live location sharing — admin map pe dikh rahe ho
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Aaj Ki Trips"  value={stats.total}     icon={MapPin}       color="brand"   />
        <StatCard title="Completed"     value={stats.completed} icon={CheckCircle}  color="emerald" />
        <StatCard title="Ongoing"       value={stats.ongoing}   icon={Navigation}   color="violet"  />
        <StatCard title="Upcoming"      value={stats.upcoming}  icon={Clock}        color="amber"   />
      </div>

      {/* Trip cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Aaj Ka Schedule</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_,i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
            <Car className="w-10 h-10" />
            <p className="text-sm">Aaj koi trip nahi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map(trip => {
              const flow = STATUS_FLOW[trip.status]
              return (
                <div key={trip._id} className="card p-5 fade-up">

                  {/* Departure Alert — auto updates every 30 sec */}
                  <DepartureAlert trip={trip} />

                  {/* Trip header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {fmtFull(trip.scheduledAt)}
                      </span>
                      {trip.travelNumber && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                          {trip.travelMode?.toUpperCase()} · {trip.travelNumber}
                        </span>
                      )}
                    </div>
                    <Badge status={trip.status} />
                  </div>

                  {/* Guest info */}
                  <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                      {trip.guest?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{trip.guest?.name}</p>
                      <p className="text-xs text-slate-400">
                        {trip.guest?.phone} · {trip.guest?.category}
                      </p>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="space-y-1.5 mb-3">
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

                  {/* Special needs */}
                  {trip.guest?.specialNeeds && (
                    <div className="mb-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs text-amber-700">⚠️ {trip.guest.specialNeeds}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <TripTimeline trip={trip} />

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    {flow && (
                      <button
                        onClick={() => updateStatus(trip._id, flow.next)}
                        disabled={updating === trip._id}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                          transition-all active:scale-[.98] disabled:opacity-60 ${flow.color}`}>
                        {updating === trip._id ? 'Updating…' : flow.label}
                      </button>
                    )}

                    {!['completed','cancelled'].includes(trip.status) && (
                      <button
                        onClick={() => setIssueTrip(trip)}
                        className="px-3 py-2.5 rounded-xl bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 transition-colors"
                        title="Issue report karo">
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    )}

                    {trip.status === 'completed' && (
                      <div className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 text-center border border-emerald-100">
                        ✅ Trip Complete
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
      <Modal open={!!issueTrip} onClose={() => setIssueTrip(null)} title="⚠️ Issue Report Karo">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">Admin notify hoga aur trip reassign kar sakta hai.</p>
          <div>
            <label className="label">Issue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map(t => (
                <button key={t.key}
                  onClick={() => setIssueForm(p=>({...p, issueType:t.key}))}
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
            <textarea className="input resize-none" rows={3}
              value={issueForm.reason}
              onChange={e => setIssueForm(p=>({...p, reason:e.target.value}))}
              placeholder="Kya hua batao…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => setIssueTrip(null)}>Cancel</button>
            <button
              className="btn-danger flex-1"
              onClick={handleIssueSubmit}
              disabled={!issueForm.reason}>
              Report Issue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
