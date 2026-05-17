import { useState, useEffect } from 'react'
import { Plus, CalendarOff, Clock, X } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

export default function DriverLeaveRequests() {
  const [leaves, setLeaves]   = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAdd]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ fromDate:'', toDate:'', reason:'' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/leaves/my')
      setLeaves(data.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/leaves', form)
      setAdd(false)
      setForm({ fromDate:'', toDate:'', reason:'' })
      load()
    } catch(err) { setError(err.response?.data?.message || 'Failed to submit') }
    finally { setSaving(false) }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try { await api.delete(`/leaves/${id}`); load() }
    catch(err) { alert(err.response?.data?.message || 'Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="page-title">Leave Requests</h1><p className="page-sub">Apply for leave and track status</p></div>
        <button className="btn-primary" onClick={() => setAdd(true)}><Plus className="w-4 h-4" /> Apply Leave</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : leaves.length === 0 ? (
        <div className="card py-16 flex flex-col items-center gap-2 text-slate-300">
          <CalendarOff className="w-10 h-10" /><p className="text-sm">No leave requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => (
            <div key={leave._id} className="card p-5 fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 font-mono">
                      {fmtDate(leave.fromDate)} → {fmtDate(leave.toDate)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">{leave.reason}</p>
                  {leave.adminNote && (
                    <div className="mt-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500"><span className="font-semibold">Admin: </span>{leave.adminNote}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={leave.status} />
                  {leave.status === 'pending' && (
                    <button onClick={() => handleCancel(leave._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-300 mt-2">Applied {fmtDate(leave.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAdd(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" required value={form.fromDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p=>({...p,fromDate:e.target.value}))} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" required value={form.toDate}
                min={form.fromDate || new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p=>({...p,toDate:e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea className="input resize-none" rows={3} required value={form.reason}
              onChange={e => setForm(p=>({...p,reason:e.target.value}))}
              placeholder="Personal work, medical leave, family emergency…" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAdd(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
