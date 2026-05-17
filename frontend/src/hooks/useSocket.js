import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const useSocket = (eventHandlers = {}) => {
  const { user } = useAuth()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) return

    socketRef.current = io('/', { transports: ['websocket'] })

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join', { userId: user._id, role: user.role })
    })


    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socketRef.current.on(event, handler)
    })

    return () => {
      socketRef.current.disconnect()
    }
  }, [user])

  return socketRef.current
}

export default useSocket
