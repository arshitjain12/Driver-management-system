import { useState, useEffect } from 'react'
import { BarChart2, Download, Car, Users, MapPin, Star } from 'lucide-react'
import api from '../../api/axios'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

export default function AdminReports() {
  const [drivers, setDrivers]   = useState([])
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [range, setRange]       = useState('week')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [dRes, tRes] = await Promise.all([
          api.get('/ratings/overview'),
          api.get('/trips'),
        ])
        setDrivers(dRes.data.data)
        setTrips(tRes.data.data)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])


  const statusCount = (status) => trips.filter(t => t.status === status).length
  const total = trips.length

  const statuses = [
    { label: 'Completed', key: 'completed', color: 'bg-emerald-400' },
    { label: 'Cancelled', key: 'cancelled', color: 'bg-red-400'     },
    { label: 'Delayed',   key: 'delayed',   color: 'bg-amber-400'   },
    { label: 'Ongoing',   key: 'in_progress',color:'bg-blue-400'    },
  ]

  const handleExport = () => {
    const rows = [
      ['Date', 'Guest', 'Driver', 'Pickup', 'Drop', 'Status', 'Travel Mode'],
      ...trips.map(t => [
        fmtDate(t.scheduledAt),
        t.guest?.name || '',
        t.driver?.name || '',
        t.pickupLocation?.address || '',
        t.dropLocation?.address || '',
        t.status,
        t.travelMode || '',
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'trips-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">Reports</h1><p className="page-sub">Trip and driver performance summary</p></div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export 
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : (
        <>
      
          <div className="card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-500" /> Trip Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {statuses.map(s => (
                <div key={s.key} className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold font-mono text-slate-700">{statusCount(s.key)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

   
            {total > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Distribution</p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {statuses.map(s => {
                    const pct = Math.round((statusCount(s.key) / total) * 100)
                    return pct > 0 ? (
                      <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${pct}%` }} title={`${s.label}: ${pct}%`} />
                    ) : null
                  })}
                </div>
                <div className="flex gap-4 mt-2 flex-wrap">
                  {statuses.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="text-[10px] text-slate-400">{s.label} ({Math.round((statusCount(s.key)/total)*100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Car className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-bold text-slate-700">Driver Performance</h2>
            </div>
            {drivers.length === 0 ? (
              <p className="text-sm text-slate-300 text-center py-10">No data</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Rank','Driver','Vehicle','Trips','Avg Rating','Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide first:pl-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drivers.map((d, i) => (
                    <tr key={d.driver._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 first:pl-5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {i+1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 font-bold text-xs">
                            {d.driver.name?.[0]?.toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-slate-700">{d.driver.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{d.driver.vehicleNumber || '—'}</td>
                      <td className="px-4 py-3.5 text-sm font-bold font-mono text-slate-700">{d.totalTrips}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-bold font-mono text-slate-700">{d.avgRating || '—'}</span>
                          <span className="text-xs text-slate-400">({d.totalRatings})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                          ${d.driver.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                            d.driver.status === 'on_trip'  ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'}`}>
                          {d.driver.status?.replace('_',' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
