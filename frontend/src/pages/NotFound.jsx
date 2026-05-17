import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home } from 'lucide-react'

export default function NotFound() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const home = { admin:'/admin', driver:'/driver', guest:'/guest' }[user?.role] || '/login'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-slate-100 font-mono">404</p>
        <p className="text-xl font-bold text-slate-700 mt-2">Page not found</p>
        <p className="text-sm text-slate-400 mt-1">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate(home)} className="btn-primary mt-6 mx-auto">
          <Home className="w-4 h-4" /> Go to Dashboard
        </button>
      </div>
    </div>
  )
}
