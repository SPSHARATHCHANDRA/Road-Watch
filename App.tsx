import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AboutPage from './pages/AboutPage'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import IncidentsPage from './pages/IncidentsPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import NotFoundPage from './pages/NotFoundPage'
import ReportPage from './pages/ReportPage'
import SensorsPage from './pages/SensorsPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="sensors" element={<SensorsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
