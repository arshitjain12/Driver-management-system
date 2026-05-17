import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

const Stars = ({ value, size = 'w-4 h-4' }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} className={`${size} ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
    ))}
  </div>
)

export default function DriverRatings() {
  const { user }              = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get(`/ratings/driver/${user._id}`)
        setData(res.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    if (user) load()
  }, [user])

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )

  const { avgRating, totalRatings, starBreakdown, ratings } = data || {}

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">My Ratings</h1><p className="page-sub">Guest feedback on your trips</p></div>

      {/* Summary card */}
      <div className="card p-6 flex items-center gap-8">
        <div className="text-center">
          <p className="text-5xl font-bold text-slate-800 font-mono">{avgRating || '—'}</p>
          <Stars value={Math.round(avgRating || 0)} size="w-5 h-5" />
          <p className="text-xs text-slate-400 mt-1">{totalRatings} reviews</p>
        </div>
        <div className="flex-1 space-y-2">
          {[5,4,3,2,1].map(star => {
            const count = starBreakdown?.[star] || 0
            const pct   = totalRatings ? Math.round((count / totalRatings) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4 text-right font-mono">{star}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-6 font-mono">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Individual ratings */}
      {!ratings?.length ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <Star className="w-10 h-10" /><p className="text-sm">No ratings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map(r => (
            <div key={r._id} className="card p-4 fade-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-xs">
                    {r.guest?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{r.guest?.name}</p>
                    <p className="text-xs text-slate-400">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
                <Stars value={r.stars} />
              </div>
              {r.comment && (
                <p className="text-xs text-slate-500 mt-3 bg-slate-50 rounded-xl px-3 py-2 italic">"{r.comment}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
