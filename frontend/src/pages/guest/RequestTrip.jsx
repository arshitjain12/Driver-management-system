import { useState } from 'react'
import { MapPin, Clock, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import api from '../../api/axios'

const TRAVEL_MODES = ['flight', 'train', 'bus', 'other']
const VEHICLE_MAP  = { 1:'Sedan', 2:'Sedan', 3:'SUV', 4:'SUV', 5:'Van', 6:'Van', 7:'Van', 8:'Van', 9:'Van' }

export default function GuestRequestTrip() {
const [form, setForm] = useState({
  pickupAddress: '', pickupLat: '', pickupLng: '',
  dropAddress: '',
  scheduledAt: '', passengerCount: 1,
  travelMode: 'other', travelNumber: '', notes: '',
})
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)  
  const [error, setError]       = useState('')

  const suggestedVehicle = VEHICLE_MAP[form.passengerCount] ||
    (form.passengerCount >= 10 ? 'Bus' : 'Van')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/dispatch/request', {
        pickupAddress:  form.pickupAddress,
        dropAddress:    form.dropAddress,
        scheduledAt:    form.scheduledAt,
        passengerCount: Number(form.passengerCount),
        travelMode:     form.travelMode,
        travelNumber:   form.travelNumber,
        notes:          form.notes,
      })
      setResult(data)
      setForm({ pickupAddress:'', dropAddress:'', scheduledAt:'', passengerCount:1, travelMode:'other', travelNumber:'', notes:'' })
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="page-title">Request a Trip</h1>
        <p className="page-sub">Fill in the details — a driver will be auto-assigned</p>
      </div>

      {/* Success state */}
      {result && (
        <div className={`card p-5 border-2 fade-up ${result.isQueued ? 'border-amber-200' : 'border-emerald-200'}`}>
          <div className="flex items-start gap-3">
            {result.isQueued
              ? <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              : <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-bold ${result.isQueued ? 'text-amber-700' : 'text-emerald-700'}`}>
                {result.isQueued ? 'Added to Queue' : 'Driver Assigned!'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{result.message}</p>

              {!result.isQueued && result.data?.driver && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-slate-600">Your Driver</p>
                  <p className="text-sm font-bold text-slate-700">{result.data.driver.name}</p>
                  <p className="text-xs text-slate-400">{result.data.driver.phone} · {result.data.driver.vehicleNumber}</p>
                  {result.data.vehicle && (
                    <p className="text-xs text-slate-400">{result.data.vehicle.vehicleType} · {result.data.vehicle.plateNumber}</p>
                  )}
                </div>
              )}

              <button onClick={() => setResult(null)} className="mt-3 text-xs text-brand-500 underline underline-offset-2">
                Request another trip
              </button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">

          {/* Pickup */}
         
<div>
  <label className="label">Pickup Location</label>
  <div className="relative">
    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
    <input className="input pl-9" required value={form.pickupAddress}
      onChange={e => setForm(p=>({...p,pickupAddress:e.target.value}))}
      placeholder="Bhopal Airport" />
  </div>
  <div className="grid grid-cols-2 gap-2 mt-2">
    <input
      className="input text-xs"
      type="number"
      step="any"
      value={form.pickupLat}
      onChange={e => setForm(p=>({...p,pickupLat:e.target.value}))}
      placeholder="Latitude  e.g. 23.2875"
    />
    <input
      className="input text-xs"
      type="number"
      step="any"
      value={form.pickupLng}
      onChange={e => setForm(p=>({...p,pickupLng:e.target.value}))}
      placeholder="Longitude  e.g. 77.3370"
    />
  </div>
</div>

          {/* Drop */}
          <div>
            <label className="label">Drop Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
              <input className="input pl-9" required value={form.dropAddress}
                onChange={e => setForm(p=>({...p,dropAddress:e.target.value}))}
                placeholder="Hotel Taj, Marine Drive" />
            </div>
          </div>

          {/* Date + Passengers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date & Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="datetime-local" className="input pl-9" required value={form.scheduledAt}
                  min={new Date().toISOString().slice(0,16)}
                  onChange={e => setForm(p=>({...p,scheduledAt:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="label">Passengers</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" className="input pl-9" min={1} max={20} value={form.passengerCount}
                  onChange={e => setForm(p=>({...p,passengerCount:e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Vehicle suggestion */}
          <div className="px-3 py-2 bg-brand-50 rounded-xl border border-brand-100 text-xs text-brand-600">
            🚗 Based on {form.passengerCount} passenger{form.passengerCount > 1 ? 's' : ''}, system will assign a <strong>{suggestedVehicle}</strong>
          </div>

          {/* Travel mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Travel Mode</label>
              <select className="input" value={form.travelMode} onChange={e => setForm(p=>({...p,travelMode:e.target.value}))}>
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
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes}
              onChange={e => setForm(p=>({...p,notes:e.target.value}))}
              placeholder="Wheelchair needed, extra luggage…" />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding driver…</>
              : '🚗 Request Trip'
            }
          </button>

          <p className="text-[10px] text-center text-slate-400">
            A driver will be automatically assigned. You'll be notified instantly.
          </p>
        </form>
      )}
    </div>
  )
}
