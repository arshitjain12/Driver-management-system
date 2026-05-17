import { useEffect } from 'react'
import { X } from 'lucide-react'

const Modal = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
     
      <div className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl fade-up`}>
    
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
