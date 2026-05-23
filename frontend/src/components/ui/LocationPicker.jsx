import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X, Loader2 } from 'lucide-react'

const injectLeafletCSS = () => {
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id = 'leaflet-css'; link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) return resolve(window.L)
  const s = document.createElement('script')
  s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  s.onload = () => resolve(window.L)
  document.head.appendChild(s)
})

export default function LocationPicker({ label, color = 'emerald', value, onChange }) {
  const [open, setOpen]           = useState(false)
  const [search, setSearch]       = useState('')
  const [suggestions, setSugg]    = useState([])
  const [searching, setSearching] = useState(false)
  const [markerPos, setMarkerPos] = useState(null)
  const [searchBoxPos, setSearchBoxPos] = useState({ top: 0, left: 0, width: 0 })
  const mapRef      = useRef(null)
  const mapDivRef   = useRef(null)
  const markerRef   = useRef(null)
  const searchRef   = useRef(null)
  const searchTimer = useRef(null)

  const dotColor = color === 'emerald' ? '#10B981' : '#EF4444'

  // ── Calculate search box position for fixed dropdown ──
  const updateSearchPos = () => {
    if (!searchRef.current) return
    const rect = searchRef.current.getBoundingClientRect()
    setSearchBoxPos({
      top:   rect.bottom + 4,
      left:  rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return
    const init = async () => {
      injectLeafletCSS()
      const L = await loadLeaflet()
      await new Promise(r => setTimeout(r, 150))
      if (!mapDivRef.current || mapRef.current) return

      const center = value?.lat ? [value.lat, value.lng] : [23.2599, 77.4126]
      mapRef.current = L.map(mapDivRef.current).setView(center, 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(mapRef.current)

      if (value?.lat) placeMarker(L, [value.lat, value.lng], value.address)

      mapRef.current.on('click', async (e) => {
        const { lat, lng } = e.latlng
        placeMarker(L, [lat, lng])
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          placeMarker(L, [lat, lng], addr)
          setMarkerPos({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), address: addr })
        } catch {
          setMarkerPos({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
        }
      })
    }
    init()
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [open])

  const placeMarker = (L, pos, address) => {
    if (markerRef.current) markerRef.current.remove()
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${dotColor};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);transform:rotate(-45deg)"></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26],
    })
    markerRef.current = L.marker(pos, { icon }).addTo(mapRef.current)
    if (address) markerRef.current.bindPopup(address.split(',')[0]).openPopup()
  }

  const handleSearch = (val) => {
    setSearch(val)
    updateSearchPos()
    clearTimeout(searchTimer.current)
    if (val.length < 3) { setSugg([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=in`)
        const data = await res.json()
        setSugg(data)
        updateSearchPos()
      } catch { setSugg([]) }
      finally { setSearching(false) }
    }, 500)
  }

  const handleSelect = async (item) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    const addr = item.display_name
    setSugg([]); setSearch(item.display_name.split(',')[0])
    const L = await loadLeaflet()
    mapRef.current?.setView([lat, lng], 15)
    placeMarker(L, [lat, lng], addr)
    setMarkerPos({ lat, lng, address: addr })
  }

  const handleConfirm = () => {
    if (!markerPos) return
    onChange(markerPos)
    setOpen(false)
    setSugg([])
    setSearch('')
  }

  return (
    <>
      {/* Trigger button */}
      <div>
        <label className="label">{label}</label>
        <button type="button" onClick={() => setOpen(true)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-white text-left transition-all
            ${value?.address ? 'border-slate-200' : 'border-dashed border-slate-300'}
            hover:border-brand-300`}>
          <MapPin className={`w-4 h-4 flex-shrink-0 ${value?.address ? (color === 'emerald' ? 'text-emerald-500' : 'text-red-400') : 'text-slate-300'}`} />
          {value?.address ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 truncate">{value.address.split(',')[0]}</p>
              <p className="text-[10px] text-slate-400 font-mono">{value.lat}, {value.lng}</p>
            </div>
          ) : (
            <span className="text-sm text-slate-400">Map pe click karke select karo…</span>
          )}
          {value?.address && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange({ address:'', lat:'', lng:'' }) }}
              className="text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </button>
      </div>

      {/* Map Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); setSugg([]); setSearch('') }} />

          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden fade-up"
            style={{ zIndex: 41 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Address search karo ya map pe click karo</p>
              </div>
              <button onClick={() => { setOpen(false); setSugg([]); setSearch('') }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search bar — z-index HIGH so suggestions appear over map */}
            <div className="px-4 py-3 border-b border-slate-100"
              style={{ position: 'relative', zIndex: 9999 }}>
              <div className="relative" ref={searchRef}>
                {searching
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                  : <Search  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                }
                <input
                  className="input pl-9"
                  placeholder="Bhopal Airport, DB City Mall, MP Nagar…"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>

              
              {suggestions.length > 0 && (
                <div
                  className="absolute left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
                  style={{ top: 'calc(100% - 8px)', zIndex: 9999 }}
                >
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => handleSelect(s)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {s.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {s.display_name.split(',').slice(1, 3).join(',')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            
            <div ref={mapDivRef} style={{ height: '360px', width: '100%', zIndex: 1 }} />

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between"
              style={{ position: 'relative', zIndex: 9999 }}>
              <div>
                {markerPos ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 truncate max-w-xs">
                      📍 {markerPos.address.split(',')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {markerPos.lat}, {markerPos.lng}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Map pe koi bhi jagah click karo</p>
                )}
              </div>
              <button type="button" onClick={handleConfirm} disabled={!markerPos}
                className="btn-primary disabled:opacity-50">
                ✅ Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
