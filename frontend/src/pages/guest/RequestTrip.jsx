import { useState } from 'react'
import { Users, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import LocationPicker from '../../components/ui/LocationPicker'
import api from '../../api/axios'

const TRAVEL_MODES  = ['flight', 'train', 'bus', 'other']
const VEHICLE_MAP   = (n) => n <= 2 ? 'Sedan' : n <= 4 ? 'SUV' : n <= 9 ? 'Van' : 'Bus'

export default function GuestRequestTrip() {
  const [pickup, setPickup]     = useState({ address:'', lat:'', lng:'' })
  const [drop, setDrop]         = useState({ address:'', lat:'', lng:'' })
  const [form, setForm]         = useState({
    scheduledAt:'', passengerCount:1,
    travelMode:'other', travelNumber:'', notes:'',
  })
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pickup.address) return setError('Pickup location select karo map se')
    if (!drop.address)   return setError('Drop location select karo map se')
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/dispatch/request', {
        pickupAddress:  pickup.address,
        pickupLat:      pickup.lat,
        pickupLng:      pickup.lng,
        dropAddress:    drop.address,
        dropLat:        drop.lat,
        dropLng:        drop.lng,
        scheduledAt:    form.scheduledAt,
        passengerCount: Number(form.passengerCount),
        travelMode:     form.travelMode,
        travelNumber:   form.travelNumber,
        notes:          form.notes,
      })
      setResult(data)
      setPickup({ address:'', lat:'', lng:'' })
      setDrop({ address:'', lat:'', lng:'' })
      setForm({ scheduledAt:'', passengerCount:1, travelMode:'other', travelNumber:'', notes:'' })
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to submit request')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="page-title">Request a Trip</h1>
        <p className="page-sub">Map pe location select karo — driver auto-assign hoga</p>
      </div>

      {/* Success */}
      {result && (
        <div className={`card p-5 border-2 fade-up ${result.isQueued ? 'border-amber-200' : 'border-emerald-200'}`}>
          <div className="flex items-start gap-3">
            {result.isQueued
              ? <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              : <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className={`text-sm font-bold ${result.isQueued ? 'text-amber-700' : 'text-emerald-700'}`}>
                {result.isQueued ? '⏳ Queue Mein Daala' : '✅ Driver Assign Ho Gaya!'}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{result.message}</p>

              {!result.isQueued && result.data?.driver && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <p className="text-xs font-bold text-slate-600">Tumhara Driver</p>
                  <p className="text-sm font-bold text-slate-800">{result.data.driver.name}</p>
                  <p className="text-xs text-slate-400">{result.data.driver.phone} · {result.data.driver.vehicleNumber}</p>
                  {result.eta && (
                    <p className="text-xs font-semibold text-brand-600">
                      🕐 Approx {result.eta} minutes mein pickup pe pahonchega
                    </p>
                  )}
                  {result.tripDuration && (
                    <p className="text-xs text-slate-400">
                      🗺️ Trip duration approx {result.tripDuration} minutes
                    </p>
                  )}
                </div>
              )}

              <button onClick={() => setResult(null)}
                className="mt-3 text-xs text-brand-500 underline underline-offset-2">
                Aur ek trip request karo
              </button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">

          {/* Pickup — Map picker */}
          <LocationPicker
            label="Pickup Location"
            color="emerald"
            value={pickup}
            onChange={setPickup}
          />

          {/* Drop — Map picker */}
          <LocationPicker
            label="Drop Location"
            color="red"
            value={drop}
            onChange={setDrop}
          />

          {/* Date + Passengers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date & Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="datetime-local" className="input pl-9" required
                  value={form.scheduledAt}
                  min={new Date().toISOString().slice(0,16)}
                  onChange={e => setForm(p=>({...p,scheduledAt:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="label">Passengers</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" className="input pl-9" min={1} max={20}
                  value={form.passengerCount}
                  onChange={e => setForm(p=>({...p,passengerCount:e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Vehicle suggestion */}
          <div className="px-3 py-2.5 bg-brand-50 rounded-xl border border-brand-100 text-xs text-brand-600 flex items-center gap-2">
            <span>🚗</span>
            <span>{form.passengerCount} passenger{form.passengerCount>1?'s':''} ke liye system <strong>{VEHICLE_MAP(Number(form.passengerCount))}</strong> assign karega</span>
          </div>

          {/* Travel mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Travel Mode</label>
              <select className="input" value={form.travelMode}
                onChange={e => setForm(p=>({...p,travelMode:e.target.value}))}>
                {TRAVEL_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {form.travelMode !== 'other' && (
              <div>
                <label className="label">{form.travelMode} Number</label>
                <input className="input" value={form.travelNumber}
                  onChange={e => setForm(p=>({...p,travelNumber:e.target.value}))}
                  placeholder="AI 202 / 12951" />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Special Instructions (optional)</label>
            <input className="input" value={form.notes}
              onChange={e => setForm(p=>({...p,notes:e.target.value}))}
              placeholder="Wheelchair, extra luggage, child seat…" />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Driver dhundh rahe hain…</>
              : '🚗 Trip Request Karo'
            }
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Nearest available driver automatically assign hoga. Instant notification milegi.
          </p>
        </form>
      )}
    </div>
  )
}
