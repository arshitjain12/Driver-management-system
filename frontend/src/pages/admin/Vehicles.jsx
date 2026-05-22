import { useState, useEffect } from 'react'
import { Plus, Car, Wrench, RotateCcw, Trash2, User } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const TYPE_COLORS = {
  Sedan: 'bg-blue-50 text-blue-600',
  SUV:   'bg-violet-50 text-violet-600',
  Van:   'bg-amber-50 text-amber-600',
  Bus:   'bg-emerald-50 text-emerald-600',
}
const STATUS_COLORS = {
  available:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  in_use:      'bg-blue-50 text-blue-600 border-blue-100',
  maintenance: 'bg-red-50 text-red-500 border-red-100',
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAdd]       = useState(false)
  const [assignOpen, setAssign] = useState(null)  
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ plateNumber:'', vehicleType:'Sedan', brand:'', model:'', color:'', notes:'' })

  const load = async () => {
    setLoading(true)
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/drivers', { params: { active: 'true' } }),
      ])
      setVehicles(vRes.data.data)
      setDrivers(dRes.data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/vehicles', form)
      setAdd(false)
      setForm({ plateNumber:'', vehicleType:'Sedan', brand:'', model:'', color:'', notes:'' })
      load()
    } catch(err) { setError(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleStatus = async (id, status) => {
    try { await api.patch(`/vehicles/${id}/status`, { status }); load() }
    catch(e) { alert(e.response?.data?.message || 'Error') }
  }

  const handleAssignDriver = async (vehicleId, driverId) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/assign-driver`, { driverId })
      setAssign(null); load()
    } catch(e) { alert(e.response?.data?.message || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this vehicle?')) return
    try { await api.delete(`/vehicles/${id}`); load() }
    catch(err) { alert(err.response?.data?.message || 'Error') }
  }

  const CAPACITY = { Sedan: 4, SUV: 6, Van: 9, Bus: 20 }
  const TYPES    = ['Sedan', 'SUV', 'Van', 'Bus']

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">Vehicles</h1><p className="page-sub">Manage fleet vehicles</p></div>
        <button className="btn-primary" onClick={() => setAdd(true)}><Plus className="w-4 h-4" /> Add Vehicle</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {TYPES.map(t => {
          const count = vehicles.filter(v => v.vehicleType === t).length
          const free  = vehicles.filter(v => v.vehicleType === t && v.status === 'available').length
          return (
            <div key={t} className="card p-4 text-center">
              <p className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mx-auto mb-2 ${TYPE_COLORS[t]}`}>{t}</p>
              <p className="text-2xl font-bold font-mono text-slate-700">{count}</p>
              <p className="text-[10px] text-slate-400">{free} available</p>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <Car className="w-10 h-10" /><p className="text-sm">No vehicles added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v._id} className="card p-5 fade-up">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-700 font-mono">{v.plateNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[v.vehicleType]}`}>
                      {v.vehicleType}
                    </span>
                    <span className="text-[10px] text-slate-400">👥 {v.capacity || CAPACITY[v.vehicleType]}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setAssign(v)} className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-500 transition-colors" title="Assign driver">
                    <User className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(v._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1 mb-4">
                {(v.brand || v.model) && (
                  <p className="text-xs text-slate-500">{[v.brand, v.model, v.color].filter(Boolean).join(' · ')}</p>
                )}
                {v.currentDriver && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <User className="w-3 h-3 text-slate-300" />
                    Driver: <span className="font-semibold">{v.currentDriver.name}</span>
                  </div>
                )}
                {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[v.status]}`}>
                  {v.status?.replace('_',' ')}
                </span>
                <div className="flex gap-1">
                  {v.status !== 'available' && (
                    <button onClick={() => handleStatus(v._id, 'available')}
                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Free
                    </button>
                  )}
                  {v.status !== 'maintenance' && (
                    <button onClick={() => handleStatus(v._id, 'maintenance')}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Service
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAdd(false)} title="Add Vehicle">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Plate Number</label><input className="input uppercase" required value={form.plateNumber} onChange={e => setForm(p=>({...p,plateNumber:e.target.value.toUpperCase()}))} placeholder="MH 01 AB 1234" /></div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input" value={form.vehicleType} onChange={e => setForm(p=>({...p,vehicleType:e.target.value}))}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Brand</label><input className="input" value={form.brand} onChange={e => setForm(p=>({...p,brand:e.target.value}))} placeholder="Toyota" /></div>
            <div><label className="label">Model</label><input className="input" value={form.model} onChange={e => setForm(p=>({...p,model:e.target.value}))} placeholder="Innova" /></div>
            <div><label className="label">Color</label><input className="input" value={form.color} onChange={e => setForm(p=>({...p,color:e.target.value}))} placeholder="White" /></div>
          </div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Any notes…" /></div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAdd(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Add Vehicle'}</button>
          </div>
        </form>
      </Modal>

      {/* Assign Driver Modal */}
      <Modal open={!!assignOpen} onClose={() => setAssign(null)} title={`Assign Driver — ${assignOpen?.plateNumber}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Select which driver will operate this vehicle today</p>
          <button onClick={() => handleAssignDriver(assignOpen._id, null)}
            className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-400 hover:bg-slate-50 transition-colors">
            None (unassign)
          </button>
          {drivers.map(d => (
            <button key={d._id} onClick={() => handleAssignDriver(assignOpen._id, d._id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors
                ${assignOpen?.currentDriver?._id === d._id
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <span className="font-semibold">{d.name}</span>
              <span className="text-slate-400 ml-2 text-xs">{d.vehicleNumber || 'No vehicle'}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
