import { useState, useEffect } from 'react'
import { Car, Users, MapPin, CalendarOff, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import api from '../../api/axios'

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

export default function AdminDashboard() {
  const [data, setData]       = useState(null)
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [tripsRes, driversRes] = await Promise.all([
          api.get('/trips/today'),
          api.get('/drivers'),
        ])
        setData(tripsRes.data.data)
        setDrivers(driversRes.data.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  const stats = data?.stats || {}
  const trips = data?.trips || []

  const driversByStatus = {
    available: drivers.filter(d => d.status === 'available'),
    on_trip:   drivers.filter(d => d.status === 'on_trip'),
    off_duty:  drivers.filter(d => d.status === 'off_duty'),
  }

  return (
    <div className="space-y-6">

   
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

   
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Trips Today" value={stats.total}    icon={MapPin}       color="brand" />
        <StatCard title="Completed"         value={stats.completed} icon={CheckCircle} color="emerald" />
        <StatCard title="Delayed"           value={stats.delayed}  icon={AlertTriangle} color="amber" />
        <StatCard title="Cancelled"         value={stats.cancelled} icon={XCircle}     color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

     
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Today's Trips</h2>
            <span className="text-xs text-slate-400 font-mono">{trips.length} total</span>
          </div>

          {trips.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-300">
              <MapPin className="w-8 h-8" />
              <p className="text-sm">No trips scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {trips.map(trip => (
                <div key={trip._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                  {/* Time */}
                  <div className="w-14 flex-shrink-0 text-center">
                    <p className="text-xs font-bold text-slate-700 font-mono">{fmt(trip.scheduledAt)}</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(trip.scheduledAt)}</p>
                  </div>

                
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{trip.guest?.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {trip.pickupLocation?.address} → {trip.dropLocation?.address}
                    </p>
                  </div>

          
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-xs font-medium text-slate-600">{trip.driver?.name}</p>
                    <p className="text-[10px] text-slate-400">{trip.driver?.vehicleNumber}</p>
                  </div>

                 
                  <Badge status={trip.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Driver Status</h2>
          </div>
          <div className="p-5 space-y-5">

            {[
              { key: 'available', label: 'Available', color: 'bg-emerald-400', textColor: 'text-emerald-600' },
              { key: 'on_trip',   label: 'On Trip',   color: 'bg-blue-400',    textColor: 'text-blue-600' },
              { key: 'off_duty',  label: 'Off Duty',  color: 'bg-slate-300',   textColor: 'text-slate-500' },
            ].map(({ key, label, color, textColor }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${textColor}`}>{driversByStatus[key].length}</span>
                </div>
                <div className="space-y-1.5">
                  {driversByStatus[key].length === 0 && (
                    <p className="text-[11px] text-slate-300 italic">None</p>
                  )}
                  {driversByStatus[key].map(d => (
                    <div key={d._id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                        {d.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-400">{d.vehicleNumber || 'No vehicle'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
