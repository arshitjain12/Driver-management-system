import { useState, useEffect } from 'react'
import { Star, CheckCircle } from 'lucide-react'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

const StarPicker = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(i => (
      <button key={i} type="button" onClick={() => onChange(i)}
        className="p-1 rounded-lg hover:scale-110 transition-transform">
        <Star className={`w-7 h-7 transition-colors ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-300'}`} />
      </button>
    ))}
  </div>
)

const STAR_LABELS = { 1:'Poor', 2:'Fair', 3:'Good', 4:'Very Good', 5:'Excellent' }

export default function GuestRateTrip() {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [ratings, setRatings] = useState({})  
  const [saving, setSaving]   = useState(null)
  const [done, setDone]       = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ratings/pending')
      setTrips(data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const setRating = (tripId, field, val) =>
    setRatings(p => ({ ...p, [tripId]: { ...p[tripId], [field]: val } }))

  const handleSubmit = async (tripId) => {
    const r = ratings[tripId]
    if (!r?.stars) return alert('Please select a star rating')
    setSaving(tripId)
    try {
      await api.post('/ratings', { tripId, stars: r.stars, comment: r.comment || '' })
      setDone(p => [...p, tripId])
    } catch(e) { alert(e.response?.data?.message || 'Error submitting rating') }
    finally { setSaving(null) }
  }

  const pending = trips.filter(t => !done.includes(t._id))

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Rate Your Trips</h1><p className="page-sub">Share feedback for completed trips</p></div>

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : pending.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          {done.length > 0 ? (
            <>
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-sm text-emerald-500 font-semibold">All trips rated! Thank you 🎉</p>
            </>
          ) : (
            <>
              <Star className="w-10 h-10" />
              <p className="text-sm">No trips pending rating</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(trip => {
            const r = ratings[trip._id] || {}
            return (
              <div key={trip._id} className="card p-5 fade-up">
                {/* Trip info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold">
                      {trip.driver?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{trip.driver?.name}</p>
                      <p className="text-xs text-slate-400">{trip.driver?.vehicleNumber} · {fmt(trip.scheduledAt)}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">Completed</span>
                </div>

                {/* Route recap */}
                <div className="px-3 py-2.5 bg-slate-50 rounded-xl mb-5 space-y-1">
                  <p className="text-xs text-slate-500">📍 {trip.pickupLocation?.address}</p>
                  <p className="text-xs text-slate-400 pl-4">→ {trip.dropLocation?.address}</p>
                </div>

                {/* Star picker */}
                <div className="mb-4">
                  <label className="label mb-2">How was your trip?</label>
                  <StarPicker value={r.stars || 0} onChange={val => setRating(trip._id, 'stars', val)} />
                  {r.stars && (
                    <p className="text-xs text-amber-500 font-semibold mt-1.5">{STAR_LABELS[r.stars]}</p>
                  )}
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <label className="label">Comment (optional)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={r.comment || ''}
                    onChange={e => setRating(trip._id, 'comment', e.target.value)}
                    placeholder="Driver was punctual and helpful…"
                  />
                </div>

                <button
                  onClick={() => handleSubmit(trip._id)}
                  disabled={!r.stars || saving === trip._id}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {saving === trip._id ? 'Submitting…' : '⭐ Submit Rating'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
