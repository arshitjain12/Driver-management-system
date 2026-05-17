const variants = {

  assigned:    'bg-blue-50 text-blue-600 border-blue-100',
  acknowledged:'bg-indigo-50 text-indigo-600 border-indigo-100',
  en_route:    'bg-violet-50 text-violet-600 border-violet-100',
  arrived:     'bg-amber-50 text-amber-600 border-amber-100',
  in_progress: 'bg-orange-50 text-orange-600 border-orange-100',
  completed:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  delayed:     'bg-yellow-50 text-yellow-600 border-yellow-100',
  cancelled:   'bg-red-50 text-red-500 border-red-100',


  available:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  on_trip:     'bg-blue-50 text-blue-600 border-blue-100',
  off_duty:    'bg-slate-50 text-slate-500 border-slate-200',


  pending:     'bg-amber-50 text-amber-600 border-amber-100',
  approved:    'bg-emerald-50 text-emerald-600 border-emerald-100',
  rejected:    'bg-red-50 text-red-500 border-red-100',


  VIP:         'bg-purple-50 text-purple-600 border-purple-100',
  Corporate:   'bg-blue-50 text-blue-600 border-blue-100',
  Regular:     'bg-slate-50 text-slate-500 border-slate-200',
  Staff:       'bg-teal-50 text-teal-600 border-teal-100',
}

const labels = {
  en_route:    'En Route',
  in_progress: 'In Progress',
  off_duty:    'Off Duty',
  on_trip:     'On Trip',
}

const Badge = ({ status, className = '' }) => {
  const style = variants[status] || 'bg-slate-50 text-slate-500 border-slate-200'
  const label = labels[status] || status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}>
      {label}
    </span>
  )
}

export default Badge
