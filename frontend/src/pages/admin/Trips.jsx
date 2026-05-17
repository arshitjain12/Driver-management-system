import { useState, useEffect } from 'react'
import { Plus, Search, MapPin, Clock, AlertTriangle, XCircle, RefreshCw, ChevronDown } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const TRAVEL_MODES = ['flight', 'train', 'bus', 'other']
const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

export default function AdminTrips() {
  const [trips, setTrips]         = useState([])
  const [guests, setGuests]       = useState([])
  const [drivers, setDrivers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('')
  const [createOpen, setCreate]   = useState(false)
  const [actionTrip, setAction]   = useState(null)  
  const [error, setError]         = useState('')
  const [suggest, setSuggest]     = useState(null)  

  const [form, setForm] = useState({
    guestId:'', driverId:'', pickupAddress:'', dropAddress:'',
    scheduledAt:'', travelMode:'other', travelNumber:'', notes:''
  })
  const [actionForm, setActionForm] = useState({ reason:'', newTime:'', newDriverId:'' })

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const [tripsRes, guestsRes, driversRes] = await Promise.all([
        api.get('/trips', { params }),
        api.get('/guests'),
        api.get('/drivers', { params: { status: 'available' } }),
      ])
      setTrips(tripsRes.data.data)
      setGuests(guestsRes.data.data)
      setDrivers(driversRes.data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  const fetchSuggest = async (guestId) => {
    if (!guestId) return setSuggest(null)
    try {
      const { data } = await api.get(`/trips/suggest-driver?guestId=${guestId}`)
      setSuggest(data.data)
    } catch(e) { console.error(e) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/trips', {
        guestId:  form.guestId,
        driverId: form.driverId,
        pickupLocation: { address: form.pickupAddress },
        dropLocation:   { address: form.dropAddress },
        scheduledAt:    form.scheduledAt,
        travelMode:     form.travelMode,
        travelNumber:   form.travelNumber,
        notes:          form.notes,
      })
      setCreate(false)
      setForm({ guestId:'', driverId:'', pickupAddress:'', dropAddress:'', scheduledAt:'', travelMode:'other', travelNumber:'', notes:'' })
      setSuggest(null)
      load()
    } catch(err) {
      const msg = err.response?.data?.message || 'Failed to create trip'
      const conflict = err.response?.data?.conflictingTrip
      setError(conflict ? `${msg} — Conflicting trip on ${fmt(conflict.scheduledAt)}` : msg)
    } finally { setSaving(false) }
  }

  const handleAction = async () => {
    if (!actionTrip) return; setSaving(true)
    const { trip, type } = actionTrip
    try {
      if (type === 'delay')    await api.patch(`/trips/${trip._id}/delay`,    { newScheduledAt: actionForm.newTime,     delayReason: actionForm.reason })
      if (type === 'cancel')   await api.patch(`/trips/${trip._id}/cancel`,   { cancelReason: actionForm.reason })
      if (type === 'reassign') await api.patch(`/trips/${trip._id}/reassign`, { newDriverId: actionForm.newDriverId })
      setAction(null); setActionForm({ reason:'', newTime:'', newDriverId:'' }); load()
    } catch(err) { alert(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const STATUS_OPTS = ['assigned','acknowledged','en_route','arrived','in_progress','completed','delayed','cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">Trips</h1><p className="page-sub">Create and manage all trips</p></div>
        <button className="btn-primary" onClick={() => setCreate(true)}><Plus className="w-4 h-4" /> New Trip</button>
      </div>


      <div className="flex flex-wrap gap-3">
        <select className="input w-44" value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button className="btn-secondary" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

    
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : trips.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-10 h-10" /><p className="text-sm">No trips found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Scheduled','Guest','Driver','Route','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide first:pl-5 last:pr-5 last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trips.map(trip => (
                <tr key={trip._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 first:pl-5">
                    <p className="text-xs font-bold text-slate-700 font-mono whitespace-nowrap">{fmt(trip.scheduledAt)}</p>
                    {trip.travelNumber && <p className="text-[10px] text-slate-400">{trip.travelMode} · {trip.travelNumber}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-700">{trip.guest?.name}</p>
                    <p className="text-xs text-slate-400">{trip.guest?.category}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-700">{trip.driver?.name}</p>
                    <p className="text-xs text-slate-400">{trip.driver?.vehicleNumber}</p>
                  </td>
                  <td className="px-4 py-3.5 max-w-44">
                    <p className="text-xs text-slate-600 truncate">{trip.pickupLocation?.address}</p>
                    <p className="text-xs text-slate-400 truncate">→ {trip.dropLocation?.address}</p>
                  </td>
                  <td className="px-4 py-3.5"><Badge status={trip.status} /></td>
                  <td className="px-4 py-3.5 pr-5">
                    {!['completed','cancelled'].includes(trip.status) && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setAction({ trip, type:'delay' }); setActionForm({ reason:'', newTime:'', newDriverId:'' }) }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors" title="Delay">
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setAction({ trip, type:'reassign' }); setActionForm({ reason:'', newTime:'', newDriverId:'' }) }}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-500 transition-colors" title="Reassign">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setAction({ trip, type:'cancel' }); setActionForm({ reason:'', newTime:'', newDriverId:'' }) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Cancel">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    
      <Modal open={createOpen} onClose={() => { setCreate(false); setSuggest(null) }} title="Create New Trip" width="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Guest</label>
              <select className="input" required value={form.guestId}
                onChange={e => { setForm(p=>({...p,guestId:e.target.value})); fetchSuggest(e.target.value) }}>
                <option value="">Select guest…</option>
                {guests.map(g => <option key={g._id} value={g._id}>{g.name} ({g.category})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Driver</label>
              <select className="input" required value={form.driverId} onChange={e => setForm(p=>({...p,driverId:e.target.value}))}>
                <option value="">Select driver…</option>
                {suggest?.suggestedDrivers?.length > 0 && (
                  <optgroup label="⭐ Suggested (served this guest before)">
                    {suggest.suggestedDrivers.map(s => <option key={s._id} value={s.driver._id}>{s.driver.name} — {s.tripCount} trips together</option>)}
                  </optgroup>
                )}
                <optgroup label="Available Drivers">
                  {drivers.map(d => <option key={d._id} value={d._id}>{d.name} · {d.vehicleNumber}</option>)}
                </optgroup>
              </select>
              {suggest?.suggestedDrivers?.length > 0 && (
                <p className="text-[10px] text-brand-500 mt-1">⭐ Suggestions based on guest history</p>
              )}
            </div>
          </div>
          <div><label className="label">Pickup Address</label><input className="input" required value={form.pickupAddress} onChange={e => setForm(p=>({...p,pickupAddress:e.target.value}))} placeholder="Airport Terminal 2, Mumbai" /></div>
          <div><label className="label">Drop Address</label><input className="input" required value={form.dropAddress} onChange={e => setForm(p=>({...p,dropAddress:e.target.value}))} placeholder="Hotel Taj, Marine Drive" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date & Time</label><input type="datetime-local" className="input" required value={form.scheduledAt} onChange={e => setForm(p=>({...p,scheduledAt:e.target.value}))} /></div>
            <div>
              <label className="label">Travel Mode</label>
              <select className="input" value={form.travelMode} onChange={e => setForm(p=>({...p,travelMode:e.target.value}))}>
                {TRAVEL_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {form.travelMode !== 'other' && (
            <div><label className="label">Flight / Train / Bus Number</label><input className="input" value={form.travelNumber} onChange={e => setForm(p=>({...p,travelNumber:e.target.value}))} placeholder="AI 202 / 12951" /></div>
          )}
          <div><label className="label">Notes (optional)</label><input className="input" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Special instructions…" /></div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => { setCreate(false); setSuggest(null) }}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Creating…' : 'Create Trip'}</button>
          </div>
        </form>
      </Modal>

   
      <Modal
        open={!!actionTrip}
        onClose={() => setAction(null)}
        title={actionTrip?.type === 'delay' ? '⏰ Delay Trip' : actionTrip?.type === 'cancel' ? '❌ Cancel Trip' : '🔄 Reassign Driver'}
      >
        <div className="space-y-4">
          {actionTrip?.type === 'delay' && (
            <div><label className="label">New Date & Time</label><input type="datetime-local" className="input" value={actionForm.newTime} onChange={e => setActionForm(p=>({...p,newTime:e.target.value}))} /></div>
          )}
          {actionTrip?.type === 'reassign' && (
            <div>
              <label className="label">New Driver</label>
              <select className="input" value={actionForm.newDriverId} onChange={e => setActionForm(p=>({...p,newDriverId:e.target.value}))}>
                <option value="">Select driver…</option>
                {drivers.map(d => <option key={d._id} value={d._id}>{d.name} · {d.vehicleNumber}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Reason</label>
            <input className="input" value={actionForm.reason} onChange={e => setActionForm(p=>({...p,reason:e.target.value}))} placeholder="Flight delayed, driver sick…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => setAction(null)}>Cancel</button>
            <button
              className={actionTrip?.type === 'cancel' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
              onClick={handleAction} disabled={saving}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
