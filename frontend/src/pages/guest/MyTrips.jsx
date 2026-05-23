import { useState, useEffect } from 'react'
import { MapPin, Phone, Clock, ChevronDown, ChevronUp, AlertCircle, Loader2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day:'numeric', month:'short', year:'numeric',
  hour:'2-digit', minute:'2-digit'
}) : '—'

// ── Single Trip Card ───────────────────────────────────
const TripCard = ({ trip, onDelaySubmit }) => {
  const [expanded, setExpanded]   = useState(false)
  const [delayOpen, setDelayOpen] = useState(false)
  const [delayForm, setDelayForm] = useState({
    newScheduledAt: '', delayReason: '', newTravelNumber: ''
  })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const canDelay = !['completed','cancelled'].includes(trip.status)

  const handleDelay = async () => {
    if (!delayForm.newScheduledAt) return setError('Naya time daalo')
    setSaving(true); setError('')
    try {
      await api.patch(`/dispatch/guest-delay/${trip._id}`, delayForm)
      setDelayOpen(false)
      onDelaySubmit()
    } catch(err) {
      setError(err.response?.data?.message || 'Error submitting delay')
    } finally { setSaving(false) }
  }

  return (
    <div className="card fade-up">
      {/* Main row */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-700 font-mono">{fmt(trip.scheduledAt)}</p>
            {trip.travelNumber && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {trip.travelMode?.toUpperCase()} · {trip.travelNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={trip.status} />
            {canDelay && (
              <button
                onClick={() => setDelayOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-100 hover:bg-amber-100 transition-colors"
                title="Flight/Train delay report karo"
              >
                <Clock className="w-3 h-3" /> Delay
              </button>
            )}
          </div>
        </div>

        {/* Driver info */}
        {trip.driver && (
          <div className="flex items-center gap-2 mb-3 p-2.5 bg-slate-50 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 font-bold text-xs flex-shrink-0">
              {trip.driver.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700">{trip.driver.name}</p>
              <p className="text-[10px] text-slate-400">{trip.driver.vehicleNumber} · {trip.driver.vehicleType}</p>
            </div>
            <a href={`tel:${trip.driver.phone}`}
              className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-500 transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Route */}
        <div className="space-y-1.5 mb-3">
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

        {/* Delay/Cancel reason */}
        {(trip.delayReason || trip.cancelReason) && (
          <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">
              {trip.delayReason ? `⏰ Delayed: ${trip.delayReason}` : `❌ Cancelled: ${trip.cancelReason}`}
            </p>
          </div>
        )}

        {/* Expand toggle */}
        {trip.statusHistory?.length > 0 && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} trip timeline
          </button>
        )}
      </div>

      {/* Status timeline */}
      {expanded && trip.statusHistory?.length > 0 && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-50 pt-4">
          {trip.statusHistory.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-300 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-600 capitalize">{h.status?.replace(/_/g,' ')}</p>
                {h.note && <p className="text-[10px] text-slate-400 mt-0.5">{h.note}</p>}
                <p className="text-[10px] text-slate-300">{fmt(h.updatedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delay Modal */}
      <Modal
        open={delayOpen}
        onClose={() => { setDelayOpen(false); setError('') }}
        title="⏰ Flight/Train Delay Report Karo"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Driver aur admin dono ko instantly notify kar diya jayega. Driver wait karega.</span>
          </div>

          <div>
            <label className="label">Naya Pickup Time</label>
            <input
              type="datetime-local"
              className="input"
              value={delayForm.newScheduledAt}
              min={new Date().toISOString().slice(0,16)}
              onChange={e => setDelayForm(p=>({...p, newScheduledAt: e.target.value}))}
            />
          </div>

          <div>
            <label className="label">Delay Ka Reason</label>
            <input
              className="input"
              value={delayForm.delayReason}
              onChange={e => setDelayForm(p=>({...p, delayReason: e.target.value}))}
              placeholder="Flight 2 ghante late hai, bad weather…"
            />
          </div>

          {trip.travelNumber && (
            <div>
              <label className="label">Flight/Train Number (agar badla ho)</label>
              <input
                className="input"
                value={delayForm.newTravelNumber}
                onChange={e => setDelayForm(p=>({...p, newTravelNumber: e.target.value}))}
                placeholder={trip.travelNumber}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              className="btn-secondary flex-1"
              onClick={() => { setDelayOpen(false); setError('') }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelay}
              disabled={saving || !delayForm.newScheduledAt}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Notifying…</>
                : '⏰ Report Delay'
              }
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────
export default function GuestMyTrips() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('upcoming')

  const load = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/trips/my-bookings')
      setData(res.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const list = tab === 'upcoming'
    ? (data?.upcoming || [])
    : (data?.past     || [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Trips</h1>
        <p className="page-sub">Upcoming aur past trips — delay bhi report kar sakte ho</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key:'upcoming', label:`Upcoming (${data?.upcoming?.length ?? 0})` },
          { key:'past',     label:`Past (${data?.past?.length     ?? 0})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all
              ${tab === t.key
                ? 'bg-brand-50 text-brand-600 border-transparent'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <MapPin className="w-10 h-10" />
          <p className="text-sm">No {tab} trips</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(trip => (
            <TripCard key={trip._id} trip={trip} onDelaySubmit={load} />
          ))}
        </div>
      )}
    </div>
  )
}
