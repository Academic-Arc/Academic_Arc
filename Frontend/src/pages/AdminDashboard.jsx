import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminDashboard.css'
import AdminSidebar from '../components/AdminSidebar'

function AdminDashboard() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)
    const [overview, setOverview] = useState({
        total_students: 0,
        total_posts: 0,
        active_categories: 0,
        posts_this_month: 0,
        recent_posts: [],
        recent_students: [],
        recent_users: [],
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDashboard = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const headers = {
                    Authorization: `Bearer ${token}`,
                }

                const [meRes, overviewRes] = await Promise.all([
                    fetch(`${API_URL}/admin/me`, { headers }),
                    fetch(`${API_URL}/admin/overview`, { headers }),
                ])

                if (!meRes.ok) {
                    localStorage.removeItem('access_token')
                    navigate('/login')
                    return
                }

                const meData = await meRes.json()
                setAdmin(meData)

                if (overviewRes.ok) {
                    const overviewData = await overviewRes.json()
                    setOverview(overviewData)
                } else {
                    const [postsRes, categoriesRes, usersRes] = await Promise.all([
                        fetch(`${API_URL}/admin/posts`, { headers }),
                        fetch(`${API_URL}/admin/categories`, { headers }),
                        fetch(`${API_URL}/admin/users`, { headers }),
                    ])

                    const posts = postsRes.ok ? await postsRes.json() : []
                    const categories = categoriesRes.ok ? await categoriesRes.json() : []
                    const users = usersRes.ok ? await usersRes.json() : []

                    const now = new Date()
                    const currentMonth = now.getMonth()
                    const currentYear = now.getFullYear()

                    const postsThisMonth = posts.filter((post) => {
                        if (!post.created_at) return false
                        const created = new Date(post.created_at)
                        return (
                            created.getMonth() === currentMonth &&
                            created.getFullYear() === currentYear
                        )
                    }).length

                    const students = users.filter((u) => u.is_student)
                    const generalUsers = users.filter(
                        (u) => !u.is_student && u.id !== meData.admin_id
                    )

                    setOverview({
                        total_students: students.length,
                        total_posts: posts.length,
                        active_categories: categories.length,
                        posts_this_month: postsThisMonth,
                        recent_posts: posts.slice(0, 5),
                        recent_students: students.slice(0, 5),
                        recent_users: generalUsers.slice(0, 5),
                    })
                }
            } catch (error) {
                console.error(error)
                navigate('/login')
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [navigate])

    const formatDate = (dateValue) => {
        if (!dateValue) return ''
        const date = new Date(dateValue)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    const renderUserList = (items, emptyTitle, emptySubtitle) => {
        if (items.length === 0) {
            return (
                <div className="admin-empty-state">
                    <div className="admin-empty-icon">
                        ♙
                    </div>

                    <h3>{emptyTitle}</h3>

                    <p>{emptySubtitle}</p>
                </div>
            )
        }

        return (
            <div className="admin-recent-list">
                {items.map((person) => (
                    <button
                        key={person.id}
                        type="button"
                        className="admin-recent-item"
                        onClick={() => navigate(`/admin/users/${person.id}`)}
                    >
                        <div className="admin-recent-student-left">
                            {person.profile_picture ? (
                                <img
                                    src={person.profile_picture}
                                    alt={person.name}
                                    className="admin-recent-avatar-img"
                                />
                            ) : (
                                <div className="admin-recent-avatar">
                                    {person.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            )}

                            <div className="admin-recent-main">
                                <strong className="admin-recent-title">
                                    {person.name}
                                </strong>
                                <span className="admin-recent-sub">
                                    {person.school
                                        ? `${person.school}${person.student_class ? ` • ${person.student_class}` : ''}`
                                        : person.email}
                                </span>
                            </div>
                        </div>

                        <span className="admin-recent-date">
                            {formatDate(person.created_at)}
                        </span>
                    </button>
                ))}
            </div>
        )
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

            <AdminSidebar
                admin={admin}
                activePage="dashboard"
                onLogout={handleLogout}
            />

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

                            <strong>{overview.total_students}</strong>

                            <span className="admin-stat-note">
                                Registered students
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Total Posts
                            </span>

                            <strong>{overview.total_posts}</strong>

                            <span className="admin-stat-note">
                                Published submissions
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Categories
                            </span>

                            <strong>{overview.active_categories}</strong>

                            <span className="admin-stat-note">
                                Active categories
                            </span>
                        </div>

                        <div className="admin-stat-card">
                            <span className="admin-stat-label">
                                Posts This Month
                            </span>

                            <strong>{overview.posts_this_month}</strong>

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

                            <button
                                type="button"
                                className="admin-view-button"
                                onClick={() => navigate('/admin/posts')}
                            >
                                View All
                            </button>
                        </div>

                        {overview.recent_posts.length > 0 ? (
                            <div className="admin-recent-list">
                                {overview.recent_posts.map((post) => (
                                    <button
                                        key={post.id}
                                        type="button"
                                        className="admin-recent-item"
                                        onClick={() => navigate(`/admin/posts/${post.id}`)}
                                    >
                                        <div className="admin-recent-main">
                                            <strong className="admin-recent-title">
                                                {post.heading || 'Untitled submission'}
                                            </strong>
                                            <span className="admin-recent-sub">
                                                {post.user_name} • {formatDate(post.created_at)}
                                            </span>
                                        </div>

                                        <span className="admin-recent-badge">
                                            {post.content_type}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="admin-empty-state">
                                <div className="admin-empty-icon">
                                    ◫
                                </div>

                                <h3>No recent posts</h3>

                                <p>
                                    Recent submissions will appear here.
                                </p>
                            </div>
                        )}

                    </div>


                    <div className="admin-panel">

                        <div className="admin-panel-header">
                            <div>
                                <p className="admin-panel-eyebrow">
                                    USERS
                                </p>

                                <h2>Recent Students</h2>
                            </div>

                            <button
                                type="button"
                                className="admin-view-button"
                                onClick={() => navigate('/admin/users')}
                            >
                                View All
                            </button>
                        </div>

                        {renderUserList(
                            overview.recent_students,
                            'No recent students',
                            'New student registrations will appear here.'
                        )}

                    </div>


                    <div className="admin-panel">

                        <div className="admin-panel-header">
                            <div>
                                <p className="admin-panel-eyebrow">
                                    USERS
                                </p>

                                <h2>Recent Users</h2>
                            </div>

                            <button
                                type="button"
                                className="admin-view-button"
                                onClick={() => navigate('/admin/users')}
                            >
                                View All
                            </button>
                        </div>

                        {renderUserList(
                            overview.recent_users || [],
                            'No recent users',
                            'New user registrations will appear here.'
                        )}

                    </div>

                </section>

            </main>

        </div>
    )
}

export default AdminDashboard