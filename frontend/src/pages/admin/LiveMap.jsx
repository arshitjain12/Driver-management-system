import { useState, useEffect, useRef } from 'react'
import { MapPin, RefreshCw, Navigation, Car } from 'lucide-react'
import api from '../../api/axios'
import useSocket from '../../hooks/useSocket'


const STATUS_COLOR = {
  available: '#10B981',
  on_trip:   '#6366F1',
  off_duty:  '#94A3B8',
}


const injectLeafletCSS = () => {
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id   = 'leaflet-css'
  link.rel  = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

export default function AdminLiveMap() {
  const mapRef        = useRef(null)   
  const mapDivRef     = useRef(null)   
  const markersRef    = useRef({})     
  const [drivers, setDrivers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setRefresh] = useState(new Date())

 
  const loadLeaflet = () => new Promise((resolve) => {
    if (window.L) return resolve(window.L)
    const script    = document.createElement('script')
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload   = () => resolve(window.L)
    document.head.appendChild(script)
  })

 
  const makeIcon = (L, status) => L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px; height:36px; border-radius:50%;
        background:${STATUS_COLOR[status] || '#94A3B8'};
        border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex; align-items:center; justify-content:center;
        font-size:16px;
      ">🚗</div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
  })

  
  const initMap = async () => {
    injectLeafletCSS()
    const L = await loadLeaflet()
    if (mapRef.current) return  

    mapRef.current = L.map(mapDivRef.current).setView([19.076, 72.877], 12)

   
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current)
  }

  
  const updateMarkers = async (driverList) => {
    const L = await loadLeaflet()
    if (!mapRef.current) return

    driverList.forEach(d => {
      if (!d.location?.lat) return

      const pos  = [d.location.lat, d.location.lng]
      const icon = makeIcon(L, d.status)

      if (markersRef.current[d._id]) {
       
        markersRef.current[d._id].setLatLng(pos)
        markersRef.current[d._id].setIcon(icon)
      } else {

        const marker = L.marker(pos, { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family:sans-serif; min-width:140px">
              <p style="font-weight:700; margin:0 0 4px">${d.name}</p>
              <p style="color:#64748B; margin:0 0 2px; font-size:12px">${d.vehicleNumber || '—'} · ${d.vehicleType || '—'}</p>
              <span style="
                background:${STATUS_COLOR[d.status]}20;
                color:${STATUS_COLOR[d.status]};
                padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600;
              ">${d.status?.replace('_',' ')}</span>
            </div>
          `)
        markersRef.current[d._id] = marker
      }
    })
  }

  const fetchDrivers = async () => {
    try {
      const { data } = await api.get('/location/drivers')
      setDrivers(data.data)
      await updateMarkers(data.data)
      setRefresh(new Date())
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    initMap().then(fetchDrivers)
    const interval = setInterval(fetchDrivers, 15000) // refresh every 15 sec
    return () => clearInterval(interval)
  }, [])


  useSocket({
    driver_location_updated: async (data) => {
      const L = await loadLeaflet()
      if (!mapRef.current) return

      const { driverId, driverName, vehicleNumber, status, location } = data
      const pos  = [location.lat, location.lng]
      const icon = makeIcon(L, status)

      if (markersRef.current[driverId]) {
        markersRef.current[driverId].setLatLng(pos)
        markersRef.current[driverId].setIcon(icon)
      } else {
        const marker = L.marker(pos, { icon })
          .addTo(mapRef.current)
          .bindPopup(`<b>${driverName}</b><br/>${vehicleNumber}`)
        markersRef.current[driverId] = marker
      }

  
      setDrivers(prev => {
        const exists = prev.find(d => d._id === driverId)
        if (exists) return prev.map(d => d._id === driverId ? { ...d, location, status } : d)
        return [...prev, { _id: driverId, name: driverName, vehicleNumber, status, location }]
      })
    },
  })

  const activeDrivers    = drivers.filter(d => d.status === 'on_trip')
  const availableDrivers = drivers.filter(d => d.status === 'available')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Live Map</h1>
          <p className="page-sub">Real-time driver locations</p>
        </div>
        <button className="btn-secondary" onClick={fetchDrivers}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'On Map',     value: drivers.length,          color: 'text-slate-600',  bg: 'bg-slate-50'  },
          { label: 'On Trip',    value: activeDrivers.length,    color: 'text-brand-600',  bg: 'bg-brand-50'  },
          { label: 'Available',  value: availableDrivers.length, color: 'text-emerald-600',bg: 'bg-emerald-50'},
        ].map(s => (
          <div key={s.label} className={`card p-3 flex items-center gap-3`}>
            <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
              <Car className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Map */}
        <div className="xl:col-span-3 card overflow-hidden" style={{ height: '520px' }}>
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Loading map…</p>
              </div>
            </div>
          )}
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Driver list */}
        <div className="card overflow-hidden flex flex-col" style={{ height: '520px' }}>
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Drivers</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Updated {lastRefresh.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {drivers.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-slate-300">
                <Navigation className="w-8 h-8" />
                <p className="text-xs">No drivers sharing location</p>
              </div>
            ) : drivers.map(d => (
              <div key={d._id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={async () => {
                  if (!d.location?.lat || !mapRef.current) return
                  mapRef.current.setView([d.location.lat, d.location.lng], 15)
                  markersRef.current[d._id]?.openPopup()
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLOR[d.status] || '#94A3B8' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                  <p className="text-[10px] text-slate-400">{d.vehicleNumber || '—'}</p>
                </div>
                {d.isStale && (
                  <span className="text-[9px] text-amber-500 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">Offline</span>
                )}
                {d.location?.lat && !d.isStale && (
                  <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        {[
          { color: '#10B981', label: 'Available' },
          { color: '#6366F1', label: 'On Trip'   },
          { color: '#94A3B8', label: 'Off Duty'  },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
        <p className="text-xs text-slate-300 ml-2">Click driver name to zoom in on map</p>
      </div>
    </div>
  )
}
