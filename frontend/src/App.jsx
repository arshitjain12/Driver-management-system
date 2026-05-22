import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login    from './pages/Login'
import NotFound from './pages/NotFound'
import Layout   from './components/layout/Layout'

// Admin
import AdminDashboard  from './pages/admin/Dashboard'
import AdminDrivers    from './pages/admin/Drivers'
import AdminGuests     from './pages/admin/Guests'
import AdminVehicles   from './pages/admin/Vehicles'
import AdminTrips      from './pages/admin/Trips'
import AdminLeaves     from './pages/admin/LeaveRequests'
import AdminLiveMap    from './pages/admin/LiveMap'
import AdminReports    from './pages/admin/Reports'

// Driver
import DriverDashboard from './pages/driver/Dashboard'
import DriverMyTrips   from './pages/driver/MyTrips'
import DriverLeaves    from './pages/driver/LeaveRequests'
import DriverRatings   from './pages/driver/Ratings'
import DriverHistory   from './pages/driver/History'

// Guest
import GuestDashboard  from './pages/guest/Dashboard'
import GuestRequestTrip from './pages/guest/RequestTrip'
import GuestMyTrips    from './pages/guest/MyTrips'
import GuestHistory    from './pages/guest/History'
import GuestRateTrip   from './pages/guest/RateTrip'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

const RootRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={{ admin:'/admin', driver:'/driver', guest:'/guest' }[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"      element={<RootRedirect />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
        <Route index          element={<AdminDashboard />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="guests"  element={<AdminGuests />} />
        <Route path="vehicles"element={<AdminVehicles />} />
        <Route path="trips"   element={<AdminTrips />} />
        <Route path="leaves"  element={<AdminLeaves />} />
        <Route path="map"     element={<AdminLiveMap />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      {/* Driver */}
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><Layout /></ProtectedRoute>}>
        <Route index          element={<DriverDashboard />} />
        <Route path="trips"   element={<DriverMyTrips />} />
        <Route path="leaves"  element={<DriverLeaves />} />
        <Route path="ratings" element={<DriverRatings />} />
        <Route path="history" element={<DriverHistory />} />
      </Route>

      {/* Guest */}
      <Route path="/guest" element={<ProtectedRoute allowedRoles={['guest']}><Layout /></ProtectedRoute>}>
        <Route index          element={<GuestDashboard />} />
        <Route path="request" element={<GuestRequestTrip />} />
        <Route path="trips"   element={<GuestMyTrips />} />
        <Route path="history" element={<GuestHistory />} />
        <Route path="ratings" element={<GuestRateTrip />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
