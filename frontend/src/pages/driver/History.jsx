import { useState, useEffect } from 'react'
import { History, Users } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function DriverHistory() {
  const { user }                      = useAuth()
  const [trips, setTrips]             = useState([])
  const [guestFreq, setGuestFreq]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('trips')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/drivers/${user._id}/history`)
        setTrips(data.data.trips || [])
        setGuestFreq(data.data.guestFrequency || [])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    if (user) load()
  }, [user])

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">History</h1><p className="page-sub">All your trips and guest records</p></div>

   
      <div className="flex gap-2">
        {[{key:'trips',label:'All Trips', icon: History},{key:'guests',label:'Guest Frequency', icon: Users}].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
              ${tab === t.key ? 'bg-brand-50 text-brand-600 border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : tab === 'trips' ? (
        trips.length === 0 ? (
          <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
            <History className="w-10 h-10" /><p className="text-sm">No trip history</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Date','Guest','Route','Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trips.map(trip => (
                  <tr key={trip._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 first:pl-5 text-xs font-mono text-slate-600 whitespace-nowrap">{fmt(trip.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700">{trip.guest?.name}</p>
                      <p className="text-xs text-slate-400">{trip.guest?.category}</p>
                    </td>
                    <td className="px-4 py-3 max-w-40">
                      <p className="text-xs text-slate-600 truncate">{trip.pickupLocation?.address}</p>
                      <p className="text-xs text-slate-400 truncate">→ {trip.dropLocation?.address}</p>
                    </td>
                    <td className="px-4 py-3"><Badge status={trip.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
       
        guestFreq.length === 0 ? (
          <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
            <Users className="w-10 h-10" /><p className="text-sm">No guest data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guestFreq.map((item, i) => (
              <div key={item._id} className="card p-4 flex items-center gap-4 fade-up">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0">
                  #{i+1}
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-xs flex-shrink-0">
                  {item.guestInfo?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{item.guestInfo?.name}</p>
                  <p className="text-xs text-slate-400">{item.guestInfo?.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-brand-500 font-mono">{item.tripCount}</p>
                  <p className="text-xs text-slate-400">trips together</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
