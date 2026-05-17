import { useState, useEffect } from 'react'
import { CalendarOff, Check, X, Clock } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import api from '../../api/axios'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function AdminLeaveRequests() {
  const [leaves, setLeaves]       = useState([])
  const [counts, setCounts]       = useState({})
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('pending')
  const [reviewItem, setReview]   = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.status = filter
      const { data } = await api.get('/leaves', { params })
      setLeaves(data.data)
      setCounts(data.counts || {})
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const handleReview = async () => {
    if (!reviewItem) return
    setSaving(true)
    try {
      await api.patch(`/leaves/${reviewItem.leave._id}/review`, {
        status: reviewItem.action,
        adminNote,
      })
      setReview(null)
      setAdminNote('')
      load()
    } catch (e) { alert(e.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const TABS = [
    { key: 'pending',  label: 'Pending',  color: 'text-amber-600',   bg: 'bg-amber-50'  },
    { key: 'approved', label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50'},
    { key: 'rejected', label: 'Rejected', color: 'text-red-500',     bg: 'bg-red-50'    },
    { key: '',         label: 'All',      color: 'text-slate-600',   bg: 'bg-slate-100' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Leave Requests</h1>
        <p className="page-sub">Review and manage driver leave applications</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  value: counts.pending,  color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-100'  },
          { label: 'Approved', value: counts.approved, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100'},
          { label: 'Rejected', value: counts.rejected, color: 'text-red-500',     bg: 'bg-red-50',     ring: 'ring-red-100'    },
        ].map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-3 fade-up">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ring-1 ${c.bg} ${c.ring}`}>
              <CalendarOff className={`w-4 h-4 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className={`text-2xl font-bold font-mono ${c.color}`}>{c.value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all border
              ${filter === t.key ? `${t.bg} ${t.color} border-transparent` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {t.label}
            {t.key === 'pending' && counts.pending > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : leaves.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-2 text-slate-300">
          <CalendarOff className="w-10 h-10" />
          <p className="text-sm">No {filter || ''} leave requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => (
            <div key={leave._id} className="card p-5 fade-up">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 font-bold text-sm flex-shrink-0">
                    {leave.driver?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{leave.driver?.name}</p>
                    <p className="text-xs text-slate-400">{leave.driver?.vehicleNumber || 'No vehicle'}</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">{leave.reason}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <Badge status={leave.status} />
                  <div className="flex items-center gap-1.5 mt-2 justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <p className="text-xs text-slate-500 font-mono whitespace-nowrap">
                      {fmtDate(leave.fromDate)} → {fmtDate(leave.toDate)}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Applied {fmtDate(leave.createdAt)}</p>
                </div>
              </div>

              {leave.adminNote && (
                <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Admin note: </span>{leave.adminNote}
                  </p>
                </div>
              )}

              {leave.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setReview({ leave, action: 'approved' }); setAdminNote('') }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { setReview({ leave, action: 'rejected' }); setAdminNote('') }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold border border-red-100 hover:bg-red-100 transition-colors">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!reviewItem} onClose={() => setReview(null)}
        title={reviewItem?.action === 'approved' ? '✅ Approve Leave' : '❌ Reject Leave'}>
        <div className="space-y-4">
          {reviewItem && (
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold">Driver:</span> {reviewItem.leave.driver?.name}</p>
              <p><span className="font-semibold">Dates:</span> {fmtDate(reviewItem.leave.fromDate)} → {fmtDate(reviewItem.leave.toDate)}</p>
              <p><span className="font-semibold">Reason:</span> {reviewItem.leave.reason}</p>
            </div>
          )}
          <div>
            <label className="label">Note for driver (optional)</label>
            <input className="input" value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder={reviewItem?.action === 'approved' ? 'Enjoy your leave!' : 'Trip conflicts on those dates…'} />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-secondary flex-1" onClick={() => setReview(null)}>Cancel</button>
            <button onClick={handleReview} disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95
                ${reviewItem?.action === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {saving ? 'Saving…' : reviewItem?.action === 'approved' ? ' Confirm Approve' : ' Confirm Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
