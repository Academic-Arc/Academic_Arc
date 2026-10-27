import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import { API_URL } from './config'
import { BackendContext } from './BackendContext'

import Login from './pages/Login'
import Signup from './pages/Signup'
import OAuthCallback from "./pages/OAuthCallback";
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Submit from './pages/Submit'
import Category from './pages/Category'
import AdminDashboard from './pages/AdminDashboard'
import AdminPosts from './pages/AdminPosts'
import AdminPostView from './pages/AdminPostView'
import AdminCategories from './pages/AdminCategories'
import AdminFeatured from './pages/AdminFeatured'
import AdminUsers from './pages/AdminUsers'
import AdminUserView from './pages/AdminUserView'
import AdminReports from './pages/AdminReports'
import AdminFeedback from './pages/AdminFeedback'
import Footer from './components/Footer'
import About from './pages/About'
import SkeletonLoader from './components/SkeletonLoader'

function App() {

    const location = useLocation();

    const [backendLoading, setBackendLoading] = useState(true)

    useEffect(() => {
      let retryTimeout = null
      let isChecking = false

      const checkBackend = async () => {
        if (isChecking) return

        isChecking = true

        try {
          const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            cache: 'no-store',
          })

          if (!response.ok) {
            throw new Error('Backend is not healthy.')
          }

          setBackendLoading(false)
        } catch (error) {
          console.error('Backend health check failed:', error)

          setBackendLoading(true)

          retryTimeout = setTimeout(checkBackend, 3000)
        } finally {
          isChecking = false
        }
      }

      checkBackend()

      return () => {
        clearTimeout(retryTimeout)
      }
    }, [location.pathname])

    useEffect(() => {
      if (backendLoading) {
        document.body.classList.add('backend-loading')
      } else {
        document.body.classList.remove('backend-loading')
      }

      return () => {
        document.body.classList.remove('backend-loading')
      }
    }, [backendLoading])

    useEffect(() => {
      window.scrollTo(0, 0);
    }, [location.pathname]);

    const showFooter =
      location.pathname === "/" ||
      location.pathname === "/dashboard" ||
      location.pathname === "/profile" ||
      location.pathname === "/submit" ||
      location.pathname === "/about" ||
      location.pathname.startsWith("/category/");
  return (
    <BackendContext.Provider value={{ backendLoading }}>

      {backendLoading ? (
        <SkeletonLoader />
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/category/:type" element={<Category />} />
          <Route path="/about" element={<About />} />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/posts" element={<AdminPosts />} />
          <Route path="/admin/posts/:id" element={<AdminPostView />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/featured" element={<AdminFeatured />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:user_id" element={<AdminUserView />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
        </Routes>
      )}

      {showFooter && <Footer />}
    </BackendContext.Provider>
  )
}

export default App