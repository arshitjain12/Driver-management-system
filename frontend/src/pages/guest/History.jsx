import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function GuestHistory() {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/trips/my-bookings')
        // show all trips sorted newest first
        const all = [...(data.data.upcoming || []), ...(data.data.past || [])]
        setTrips(all.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)))
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Trip History</h1><p className="page-sub">Complete record of all your trips</p></div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : trips.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <History className="w-10 h-10" /><p className="text-sm">No trip history yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Date','Driver','Route','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {trips.map(trip => (
                <tr key={trip._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 first:pl-5 text-xs font-mono text-slate-600 whitespace-nowrap">{fmt(trip.scheduledAt)}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-slate-700">{trip.driver?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{trip.driver?.vehicleNumber}</p>
                  </td>
                  <td className="px-4 py-3.5 max-w-48">
                    <p className="text-xs text-slate-600 truncate">{trip.pickupLocation?.address}</p>
                    <p className="text-xs text-slate-400 truncate">→ {trip.dropLocation?.address}</p>
                  </td>
                  <td className="px-4 py-3.5"><Badge status={trip.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
