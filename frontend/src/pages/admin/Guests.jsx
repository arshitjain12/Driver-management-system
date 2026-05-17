import { useState, useEffect } from 'react'
import { Plus, Search, User, Phone, Building2, Trash2, RotateCcw, Eye, EyeOff } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const CATEGORIES = ['VIP', 'Corporate', 'Regular', 'Staff']

export default function AdminGuests() {
  const [guests, setGuests]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilter]      = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [addOpen, setAddOpen]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [form, setForm]             = useState({ name:'', email:'', phone:'', password:'', company:'', category:'Regular', specialNeeds:'' })

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterCat)    params.category = filterCat
      if (search)       params.search   = search
      params.active = showInactive ? 'false' : 'true'
      const { data } = await api.get('/guests', { params })
      setGuests(data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, filterCat, showInactive])

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/guests', form)
      setAddOpen(false)
      setForm({ name:'', email:'', phone:'', password:'', company:'', category:'Regular', specialNeeds:'' })
      load()
    } catch(err) { setError(err.response?.data?.message || 'Failed to add guest') }
    finally { setSaving(false) }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this guest?')) return
    try { await api.delete(`/guests/${id}`); load() }
    catch(err) { alert(err.response?.data?.message || 'Error') }
  }


  const handleReactivate = async (id) => {
    try {
      await api.put(`/guests/${id}`, { isActive: true })
      load()
    } catch(err) { alert(err.response?.data?.message || 'Error reactivating guest') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">Guests</h1><p className="page-sub">Manage guest profiles and history</p></div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Guest</button>
      </div>

    
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={filterCat} onChange={e => setFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
          ⚠️ You are viewing deactivated guests. Click <strong>Reactivate</strong> to restore them.
        </div>
      )}

     
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : guests.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-2 text-slate-300">
          <User className="w-10 h-10" />
          <p className="text-sm">{showInactive ? 'No inactive guests' : 'No guests found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Guest</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Trips</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {guests.map(g => (
                <tr key={g._id} className={`hover:bg-slate-50/60 transition-colors ${!g.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-xs flex-shrink-0">
                        {g.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-700">{g.name}</p>
                          {!g.isActive && (
                            <span className="text-[10px] bg-red-50 text-red-400 border border-red-100 px-1.5 py-0.5 rounded-full font-semibold">Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-32">{g.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />{g.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-300" />{g.company || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Badge status={g.category} /></td>
                  <td className="px-5 py-3.5 text-right text-xs font-mono font-bold text-slate-600">{g.totalTrips ?? 0}</td>
                  <td className="px-5 py-3.5 text-right">
                    {g.isActive ? (
                      <button
                        onClick={() => handleDeactivate(g._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                        title="Deactivate guest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(g._id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100 hover:bg-emerald-100 transition-colors ml-auto"
                        title="Reactivate guest"
                      >
                        <RotateCcw className="w-3 h-3" /> Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

   
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Guest">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name</label><input className="input" required value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Rahul Sharma" /></div>
            <div><label className="label">Phone</label><input className="input" required value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+91 98765 43210" /></div>
          </div>
          <div><label className="label">Email</label><input type="email" className="input" required value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="guest@company.com" /></div>
          <div><label className="label">Password</label><input type="password" className="input" required value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Company</label><input className="input" value={form.company} onChange={e => setForm(p=>({...p,company:e.target.value}))} placeholder="Acme Corp" /></div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Special Needs</label><input className="input" value={form.specialNeeds} onChange={e => setForm(p=>({...p,specialNeeds:e.target.value}))} placeholder="Wheelchair, child seat…" /></div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Add Guest'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
