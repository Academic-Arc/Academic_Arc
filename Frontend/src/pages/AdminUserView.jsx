import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminDashboard.css'
import './AdminUserView.css'
import AdminSidebar from '../components/AdminSidebar'

function AdminUserView() {
    const navigate = useNavigate()
    const { user_id } = useParams()

    const [admin, setAdmin] = useState(null)
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const [adminResponse, userResponse] = await Promise.all([
                    fetch(`${API_URL}/admin/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),

                    fetch(`${API_URL}/admin/users/${user_id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ])

                if (!adminResponse.ok || !userResponse.ok) {
                    navigate('/login')
                    return
                }

                const adminData = await adminResponse.json()
                const userData = await userResponse.json()

                setAdmin(adminData)
                setUser(userData)
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [navigate, user_id])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

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
                Loading user...
            </div>
        )
    }

    if (!user) {
        return (
            <div className="admin-loading">
                User not found.
            </div>
        )
    }

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}

            <AdminSidebar
                admin={admin}
                activePage="users"
                onLogout={handleLogout}
            />

            {/* MAIN CONTENT */}

            <main className="admin-main">

                <header className="admin-header">

                    <div>

                        <button
                            className="admin-back-button"
                            onClick={() => navigate('/admin/users')}
                        >
                            ← Back to Users
                        </button>

                        <p className="admin-eyebrow">
                            USER PROFILE
                        </p>

                        <h1>{user.name}</h1>

                        <p className="admin-welcome">
                            View account information and activity.
                        </p>

                    </div>

                </header>


                <section className="admin-user-detail">

                    {/* PROFILE CARD */}

                    <div className="admin-panel admin-user-profile-panel">

                        <div className="admin-user-profile">

                            <div className="admin-user-profile-avatar">

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

                                <h2>{user.name}</h2>

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

                            </div>

                        </div>

                    </div>


                    {/* ACCOUNT INFORMATION */}

                    <div className="admin-panel">

                        <div className="admin-panel-header">

                            <div>
                                <p className="admin-panel-eyebrow">
                                    ACCOUNT
                                </p>

                                <h2>Account Information</h2>
                            </div>

                        </div>

                        <div className="admin-user-info-grid">

                            <div>
                                <span>Email</span>
                                <strong>{user.email}</strong>
                            </div>

                            <div>
                                <span>Phone</span>
                                <strong>{user.phone || '—'}</strong>
                            </div>

                            <div>
                                <span>Registered</span>
                                <strong>
                                    {formatDate(user.created_at)}
                                </strong>
                            </div>

                            <div>
                                <span>Date of Birth</span>
                                <strong>
                                    {formatDate(user.dob)}
                                </strong>
                            </div>

                            <div>
                                <span>District</span>
                                <strong>
                                    {user.district || '—'}
                                </strong>
                            </div>

                            <div>
                                <span>Locality</span>
                                <strong>
                                    {user.village_locality || '—'}
                                </strong>
                            </div>

                        </div>

                    </div>


                    {/* STUDENT INFORMATION */}

                    {user.is_student && (
                        <div className="admin-panel">

                            <div className="admin-panel-header">

                                <div>
                                    <p className="admin-panel-eyebrow">
                                        STUDENT
                                    </p>

                                    <h2>Student Information</h2>
                                </div>

                            </div>

                            <div className="admin-user-info-grid">

                                <div>
                                    <span>School</span>
                                    <strong>
                                        {user.school || '—'}
                                    </strong>
                                </div>

                                <div>
                                    <span>Class</span>
                                    <strong>
                                        {user.student_class || '—'}
                                    </strong>
                                </div>

                            </div>

                        </div>
                    )}


                    {/* SUBMISSIONS */}

                    <div className="admin-panel">

                        <div className="admin-panel-header">

                            <div>
                                <p className="admin-panel-eyebrow">
                                    ACTIVITY
                                </p>

                                <h2>
                                    Submissions ({user.submission_count})
                                </h2>
                            </div>

                        </div>

                        {user.submissions?.length === 0 ? (

                            <div className="admin-empty-state">
                                <div className="admin-empty-icon">
                                    ◫
                                </div>

                                <h3>No submissions</h3>

                                <p>
                                    This user has not submitted any posts.
                                </p>
                            </div>

                        ) : (

                            <div className="admin-user-submissions">

                                {user.submissions.map((submission) => (

                                    <div
                                        className="admin-user-submission"
                                        key={submission.id}
                                    >

                                        <div>
                                            <span className="admin-user-submission-type">
                                                {submission.content_type}
                                            </span>

                                            <h3>
                                                {submission.heading}
                                            </h3>

                                            {submission.description && (
                                                <p>
                                                    {submission.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="admin-user-submission-date">
                                            {formatDate(
                                                submission.created_at
                                            )}
                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>

                </section>

            </main>

        </div>
    )
}

export default AdminUserView