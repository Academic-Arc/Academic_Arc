import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminDashboard.css'

function AdminDashboard() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const verifyAdmin = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const response = await fetch(
                    `${API_URL}/admin/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!response.ok) {
                    localStorage.removeItem('access_token')
                    navigate('/login')
                    return
                }

                const data = await response.json()
                setAdmin(data)
            } catch (error) {
                console.error(error)
                navigate('/login')
            } finally {
                setLoading(false)
            }
        }

        verifyAdmin()
    }, [navigate])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    if (loading) {
        return (
            <div className="admin-loading">
                Loading admin panel...
            </div>
        )
    }

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}
            <aside className="admin-sidebar">

                <div className="admin-brand">
                    <h2>Academic Arc</h2>
                    <span>ADMIN PANEL</span>
                </div>

                <nav className="admin-nav">

                    <button className="admin-nav-item active">
                        <span>▦</span>
                        Dashboard
                    </button>

                    <div className="admin-nav-section">
                        CONTENT
                    </div>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/posts')}
                    >
                        <span>◫</span>
                        Posts
                    </button>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/categories')}
                    >
                        <span>◈</span>
                        Categories
                    </button>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/featured')}
                    >
                        <span>★</span>
                        Featured
                    </button>

                    <div className="admin-nav-section">
                        USERS
                    </div>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/users')}
                    >
                        <span>♙</span>
                        Users
                    </button>

                    <button className="admin-nav-item">
                        <span>⚑</span>
                        Reports
                    </button>

                    <button className="admin-nav-item">
                        <span>♟</span>
                        Admins
                    </button>

                    <div className="admin-nav-section">
                        SYSTEM
                    </div>

                    <button className="admin-nav-item">
                        <span>⚙</span>
                        Settings
                    </button>

                </nav>

                <div className="admin-sidebar-bottom">

                    <div className="admin-user">
                        <div className="admin-avatar">
                            {admin?.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="admin-user-info">
                            <strong>{admin?.name}</strong>
                            <span>Administrator</span>
                        </div>
                    </div>

                    <button
                        className="admin-logout"
                        onClick={handleLogout}
                    >
                        ← Logout
                    </button>

                </div>

            </aside>


            {/* MAIN CONTENT */}
            <main className="admin-main">

                <header className="admin-header">

                    <div>
                        <p className="admin-eyebrow">
                            ADMIN PANEL
                        </p>

                        <h1>Dashboard</h1>

                        <p className="admin-welcome">
                            Welcome back, {admin?.name}.
                        </p>
                    </div>

                    <div className="admin-header-profile">
                        <div className="admin-header-avatar">
                            {admin?.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div>
                            <strong>{admin?.name}</strong>
                            <span>Administrator</span>
                        </div>
                    </div>

                </header>


                {/* OVERVIEW */}
                <section className="admin-section">

                    <div className="admin-section-heading">
                        <h2>Overview</h2>
                    </div>

                    <div className="admin-stats-grid">

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Total Students
                            </span>

                            <strong>—</strong>

                            <span className="admin-stat-note">
                                Registered students
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Total Posts
                            </span>

                            <strong>—</strong>

                            <span className="admin-stat-note">
                                Published submissions
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Categories
                            </span>

                            <strong>—</strong>

                            <span className="admin-stat-note">
                                Active categories
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Posts This Month
                            </span>

                            <strong>—</strong>

                            <span className="admin-stat-note">
                                Current month
                            </span>
                        </div>

                    </div>

                </section>


                {/* LOWER DASHBOARD */}
                <section className="admin-dashboard-grid">

                    <div className="admin-panel">

                        <div className="admin-panel-header">
                            <div>
                                <p className="admin-panel-eyebrow">
                                    ACTIVITY
                                </p>

                                <h2>Recent Posts</h2>
                            </div>

                            <button className="admin-view-button">
                                View All
                            </button>
                        </div>

                        <div className="admin-empty-state">
                            <div className="admin-empty-icon">
                                ◫
                            </div>

                            <h3>No recent posts</h3>

                            <p>
                                Recent submissions will appear here.
                            </p>
                        </div>

                    </div>


                    <div className="admin-panel">

                        <div className="admin-panel-header">
                            <div>
                                <p className="admin-panel-eyebrow">
                                    USERS
                                </p>

                                <h2>Recent Students</h2>
                            </div>

                            <button className="admin-view-button">
                                View All
                            </button>
                        </div>

                        <div className="admin-empty-state">
                            <div className="admin-empty-icon">
                                ♙
                            </div>

                            <h3>No recent students</h3>

                            <p>
                                New registrations will appear here.
                            </p>
                        </div>

                    </div>

                </section>

            </main>

        </div>
    )
}

export default AdminDashboard