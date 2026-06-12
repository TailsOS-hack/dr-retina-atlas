import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { Home, Database, Microscope, BarChart3, BookOpen, Activity, Menu, X } from 'lucide-react'
import { generateCells } from './data/generateData'
import HomePage from './pages/HomePage'
import DatasetsPage from './pages/DatasetsPage'
import ExplorerPage from './pages/ExplorerPage'
import AnalysisPage from './pages/AnalysisPage'
import GuidePage from './pages/GuidePage'

const atlasData = generateCells()

function NavBar({ mobileOpen, setMobileOpen }) {
  const location = useLocation()
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/datasets', icon: Database, label: 'Datasets' },
    { to: '/explorer', icon: Microscope, label: 'Cell Explorer' },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/guide', icon: BookOpen, label: 'How-To Guide' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">DR-Atlas</div>
            <div className="text-slate-400 text-xs">Diabetic Retinopathy scRNA-seq</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-2 flex flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

function AppInner() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="pt-14">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/explorer" element={<ExplorerPage data={atlasData} />} />
          <Route path="/analysis" element={<AnalysisPage data={atlasData} />} />
          <Route path="/guide" element={<GuidePage />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
