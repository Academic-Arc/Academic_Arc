import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminUsers.css'

function AdminUsers() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        const fetchUsers = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            fetch(`${API_URL}/admin/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch admin')
                    }

                    return response.json()
                })
                .then((data) => {
                    setAdmin(data)
                })
                .catch((error) => {
                    console.error('Error fetching admin:', error)
                })

            try {
                const response = await fetch(
                    `${API_URL}/admin/users`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!response.ok) {
                    navigate('/login')
                    return
                }

                const data = await response.json()
                setUsers(data)
            } catch (error) {
                console.error('Error fetching users:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [navigate])

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())

        const matchesFilter =
            filter === 'all' ||
            (filter === 'students' && user.is_student) ||
            (filter === 'non-students' && !user.is_student)

        return matchesSearch && matchesFilter
    })

    const formatDate = (date) => {
        if (!date) return '—'

        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="admin-loading">
                Loading users...
            </div>
        )
    }

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
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

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin')}
                    >
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

                    <button className="admin-nav-item active">
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
                            USERS
                        </p>

                        <h1>Users</h1>

                        <p className="admin-welcome">
                            Manage and view registered Academic Arc users.
                        </p>
                    </div>

                </header>


                <section className="admin-section">

                    <div className="admin-panel">

                        <div className="admin-panel-header">

                            <div>
                                <p className="admin-panel-eyebrow">
                                    DIRECTORY
                                </p>

                                <h2>
                                    All Users ({filteredUsers.length})
                                </h2>
                            </div>

                        </div>


                        {/* FILTERS */}
                        <div className="admin-users-toolbar">

                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="admin-users-search"
                            />

                            <div className="admin-users-filters">

                                <button
                                    className={filter === 'all' ? 'active' : ''}
                                    onClick={() => setFilter('all')}
                                >
                                    All
                                </button>

                                <button
                                    className={
                                        filter === 'students'
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() => setFilter('students')}
                                >
                                    Students
                                </button>

                                <button
                                    className={
                                        filter === 'non-students'
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setFilter('non-students')
                                    }
                                >
                                    Non-students
                                </button>

                            </div>

                        </div>


                        {/* USERS TABLE */}
                        {filteredUsers.length === 0 ? (

                            <div className="admin-empty-state">
                                <div className="admin-empty-icon">
                                    ♙
                                </div>

                                <h3>No users found</h3>

                                <p>
                                    Try changing your search or filter.
                                </p>
                            </div>

                        ) : (

                            <div className="admin-users-table-wrapper">

                                <table className="admin-users-table">

                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Type</th>
                                            <th>School / Class</th>
                                            <th>Submissions</th>
                                            <th>Registered</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {filteredUsers.map((user) => (

                                            <tr
                                                key={user.id}
                                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                                className="admin-user-row"
                                            >

                                                <td>
                                                    <div className="admin-user-cell">

                                                        <div className="admin-user-table-avatar">
                                                            {user.profile_picture ? (
                                                                <img
                                                                    src={user.profile_picture}
                                                                    alt={user.name}
                                                                />
                                                            ) : (
                                                                user.name
                                                                    ?.charAt(0)
                                                                    .toUpperCase()
                                                            )}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {user.name}
                                                            </strong>

                                                            <span>
                                                                {user.email}
                                                            </span>
                                                        </div>

                                                    </div>
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            user.is_student
                                                                ? 'admin-user-type student'
                                                                : 'admin-user-type non-student'
                                                        }
                                                    >
                                                        {user.is_student
                                                            ? 'Student'
                                                            : 'Non-student'}
                                                    </span>
                                                </td>

                                                <td>
                                                    {user.is_student ? (
                                                        <div className="admin-school-cell">
                                                            <strong>
                                                                {user.school || '—'}
                                                            </strong>

                                                            <span>
                                                                Class {user.student_class || '—'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="admin-muted">
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {user.submission_count}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {formatDate(user.created_at)}
                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </section>

            </main>

        </div>
    )
}

export default AdminUsers