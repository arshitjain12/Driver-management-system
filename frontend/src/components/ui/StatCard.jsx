const StatCard = ({ title, value, sub, icon: Icon, color = 'brand', trend }) => {
  const colors = {
    brand:   { bg: 'bg-brand-50',   icon: 'text-brand-500',   ring: 'ring-brand-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   ring: 'ring-amber-100' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-500',     ring: 'ring-red-100' },
    violet:  { bg: 'bg-violet-50',  icon: 'text-violet-500',  ring: 'ring-violet-100' },
  }
  const c = colors[color] || colors.brand

  return (
    <div className="card p-5 flex items-start gap-4 fade-up">
      <div className={`p-3 rounded-2xl ring-1 ${c.bg} ${c.ring}`}>
        <Icon className={`w-5 h-5 ${c.icon}`} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-800 font-mono mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold mt-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  )
}

export default StatCard
