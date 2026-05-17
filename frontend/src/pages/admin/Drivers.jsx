import { useState, useEffect } from 'react'
import { Plus, Search, Star, Car, Phone, Trash2, StickyNote, RotateCcw, Eye, EyeOff } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const STATUS_OPTIONS = ['available', 'on_trip', 'off_duty']
const VEHICLE_TYPES  = ['Sedan', 'SUV', 'Van', 'Bus']

const StarRating = ({ value }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} className={`w-3 h-3 ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
    ))}
    <span className="text-xs text-slate-500 ml-1 font-mono">{value || '—'}</span>
  </div>
)

export default function AdminDrivers() {
  const [drivers, setDrivers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState('')
  const [showInactive, setShowInactive] = useState(false)   
  const [addOpen, setAddOpen]       = useState(false)
  const [noteDriver, setNoteDriver] = useState(null)
  const [note, setNote]             = useState('')
  const [form, setForm]             = useState({ name:'', email:'', phone:'', password:'', vehicleNumber:'', vehicleType:'Sedan', licenseNumber:'' })
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (search)       params.search = search
  
      params.active = showInactive ? 'false' : 'true'
      const { data } = await api.get('/drivers', { params })
      setDrivers(data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filterStatus, showInactive])

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/drivers', form)
      setAddOpen(false)
      setForm({ name:'', email:'', phone:'', password:'', vehicleNumber:'', vehicleType:'Sedan', licenseNumber:'' })
      load()
    } catch(err) { setError(err.response?.data?.message || 'Failed to add driver') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/drivers/${id}/status`, { status }); load() }
    catch(e) { console.error(e) }
  }

  const handleSaveNote = async () => {
    if (!noteDriver) return; setSaving(true)
    try { await api.patch(`/drivers/${noteDriver._id}/notes`, { adminNotes: note }); setNoteDriver(null); load() }
    catch(e) { console.error(e) }
    finally { setSaving(false) }
  }


  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this driver? They will not receive new trips.')) return
    try { await api.delete(`/drivers/${id}`); load() }
    catch(err) { alert(err.response?.data?.message || 'Error') }
  }


  const handleReactivate = async (id) => {
    try {
      await api.put(`/drivers/${id}`, { isActive: true })
      load()
    } catch(err) { alert(err.response?.data?.message || 'Error reactivating driver') }
  }

  return (
    <div className="space-y-6">

    
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-sub">Manage all registered drivers</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>


        <button
          onClick={() => setShowInactive(p => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
            ${showInactive
              ? 'bg-red-50 text-red-500 border-red-100'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
        >
          {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showInactive ? 'Showing Inactive' : 'Show Inactive'}
        </button>
      </div>

    
      {showInactive && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500 font-medium">
          ⚠️ You are viewing deactivated drivers. Click <strong>Reactivate</strong> to restore them.
        </div>
      )}


      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      ) : drivers.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-2 text-slate-300">
          <Car className="w-10 h-10" />
          <p className="text-sm">{showInactive ? 'No inactive drivers' : 'No active drivers found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <div key={driver._id} className={`card p-5 fade-up ${!driver.isActive ? 'opacity-70 border-red-100' : ''}`}>

              {!driver.isActive && (
                <div className="mb-3 px-2.5 py-1 bg-red-50 border border-red-100 rounded-lg text-xs text-red-500 font-semibold w-fit">
                  Deactivated
                </div>
              )}

             
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold text-sm">
                    {driver.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{driver.name}</p>
                    <p className="text-xs text-slate-400">{driver.licenseNumber || 'No license'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {driver.isActive && (
                    <button
                      onClick={() => { setNoteDriver(driver); setNote(driver.adminNotes || '') }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-500 transition-colors"
                      title="Private note"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>
                  )}

               
                  {driver.isActive ? (
                    <button
                      onClick={() => handleDeactivate(driver._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Deactivate driver"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(driver._id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      title="Reactivate driver"
                    >
                      <RotateCcw className="w-3 h-3" /> Reactivate
                    </button>
                  )}
                </div>
              </div>

         
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-300" />{driver.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Car className="w-3.5 h-3.5 text-slate-300" />
                  {driver.vehicleNumber || 'No vehicle'} · {driver.vehicleType || '—'}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 text-slate-300" />
                  <StarRating value={driver.avgRating} />
                  <span className="text-slate-400 font-mono ml-1">({driver.totalTrips} trips)</span>
                </div>
              </div>

          
              {driver.isActive ? (
                <div className="flex items-center justify-between">
                  <Badge status={driver.status} />
                  <select
                    value={driver.status}
                    onChange={e => handleStatusChange(driver._id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white outline-none cursor-pointer hover:border-brand-300 transition-colors"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Driver cannot be assigned trips while inactive.</p>
              )}
            </div>
          ))}
        </div>
      )}

  
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Driver">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name</label><input className="input" required value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Amit Kumar" /></div>
            <div><label className="label">Phone</label><input className="input" required value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 98765 43210" /></div>
          </div>
          <div><label className="label">Email</label><input type="email" className="input" required value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="driver@company.com" /></div>
          <div><label className="label">Password</label><input type="password" className="input" required value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Vehicle Number</label><input className="input" value={form.vehicleNumber} onChange={e => setForm(p=>({...p,vehicleNumber:e.target.value}))} placeholder="MH 01 AB 1234" /></div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input" value={form.vehicleType} onChange={e => setForm(p=>({...p,vehicleType:e.target.value}))}>
                {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">License Number</label><input className="input" value={form.licenseNumber} onChange={e => setForm(p=>({...p,licenseNumber:e.target.value}))} placeholder="DL 1234 5678" /></div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Add Driver'}</button>
          </div>
        </form>
      </Modal>

  
      <Modal open={!!noteDriver} onClose={() => setNoteDriver(null)} title={`Note — ${noteDriver?.name}`}>
        <p className="text-xs text-slate-400 mb-3">This note is private and only visible to admins.</p>
        <textarea className="input resize-none" rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Prefer for VIP guests, very punctual…" />
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1" onClick={() => setNoteDriver(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={handleSaveNote} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
        </div>
      </Modal>
    </div>
  )
}
