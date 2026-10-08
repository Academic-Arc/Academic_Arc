import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import './AdminFeedback.css'
import AdminSidebar from '../components/AdminSidebar'

function AdminFeedback() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)

    const token = localStorage.getItem('access_token')

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    const fetchFeedback = async () => {
        try {
            const response = await fetch(
                `${API_URL}/admin/feedback`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                throw new Error('Failed to fetch feedback')
            }

            const data = await response.json()
            setFeedback(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!token) {
            navigate('/login')
            return
        }

        fetchFeedback()
    }, [])

    const updateFeedbackStatus = async (feedbackId, status) => {
        try {
            const params = new URLSearchParams({
                status,
            })

            const response = await fetch(
                `${API_URL}/admin/feedback/${feedbackId}?${params.toString()}`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Failed to update feedback'
                )
            }

            setFeedback(prev =>
                prev.map(item =>
                    item.id === feedbackId
                        ? {
                            ...item,
                            status,
                        }
                        : item
                )
            )
        } catch (error) {
            console.error(error)
            alert(error.message)
        }
    }

    const handleDeleteFeedback = async (feedbackId) => {
        const confirmed = window.confirm(
            'Are you sure you want to permanently delete this feedback?'
        )

        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(
                `${API_URL}/admin/feedback/${feedbackId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Failed to delete feedback'
                )
            }

            setFeedback(prev =>
                prev.filter(
                    item => item.id !== feedbackId
                )
            )

            alert('Feedback deleted successfully.')
        } catch (error) {
            console.error(error)
            alert(error.message)
        }
    }

    const handleReply = (email) => {
        if (!email) {
            return
        }

        window.location.href = `mailto:${email}`
    }

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}
            <AdminSidebar
                admin={admin}
                activePage="feedback"
                onLogout={handleLogout}
            />

            {/* MAIN CONTENT */}
            <main className="admin-main">

                <header className="admin-header">

                    <div>
                        <p className="admin-eyebrow">
                            ADMIN PANEL
                        </p>

                        <h1>Feedback</h1>

                        <p className="admin-welcome">
                            Review feedback submitted through
                            the Academic Arc website.
                        </p>
                    </div>

                </header>

                <section className="admin-section">

                    {loading ? (
                        <div className="admin-empty-state">
                            <p>Loading feedback...</p>
                        </div>
                    ) : feedback.length === 0 ? (
                        <div className="admin-empty-state">

                            <div className="admin-empty-icon">
                                ✉
                            </div>

                            <h3>No feedback</h3>

                            <p>
                                There is currently no feedback
                                to review.
                            </p>

                        </div>
                    ) : (
                        <div className="admin-feedback-list">

                            {feedback.map(item => (

                                <article
                                    key={item.id}
                                    className="admin-feedback-card"
                                >

                                    <div className="admin-feedback-top">

                                        <div>
                                            <p className="admin-panel-eyebrow">
                                                FEEDBACK #{item.id}
                                            </p>

                                            <h2>
                                                {item.is_anonymous
                                                    ? 'Anonymous visitor'
                                                    : item.name || 'Registered user'}
                                            </h2>
                                        </div>

                                        <span
                                            className={`feedback-status feedback-status-${item.status}`}
                                        >
                                            {item.status}
                                        </span>

                                    </div>


                                    <div className="admin-feedback-info">

                                        <p>
                                            <strong>
                                                Email:
                                            </strong>{' '}
                                            {item.email || 'Not provided'}
                                        </p>

                                        <p>
                                            <strong>
                                                Submitted:
                                            </strong>{' '}
                                            {new Date(
                                                item.created_at
                                            ).toLocaleString()}
                                        </p>

                                        <div className="admin-feedback-message">

                                            <strong>
                                                Feedback:
                                            </strong>

                                            <p>
                                                {item.message}
                                            </p>

                                        </div>

                                    </div>


                                    <div className="admin-feedback-actions">

                                        {item.status === 'new' && (
                                            <button
                                                onClick={() =>
                                                    updateFeedbackStatus(
                                                        item.id,
                                                        'read'
                                                    )
                                                }
                                            >
                                                Mark as Read
                                            </button>
                                        )}

                                        {item.status !== 'resolved' && (
                                            <button
                                                onClick={() =>
                                                    updateFeedbackStatus(
                                                        item.id,
                                                        'resolved'
                                                    )
                                                }
                                            >
                                                Resolve
                                            </button>
                                        )}

                                        {item.email && (
                                            <button
                                                onClick={() =>
                                                    handleReply(
                                                        item.email
                                                    )
                                                }
                                            >
                                                Reply
                                            </button>
                                        )}

                                        <button
                                            className="admin-danger-button"
                                            onClick={() =>
                                                handleDeleteFeedback(
                                                    item.id
                                                )
                                            }
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </article>

                            ))}

                        </div>
                    )}

                </section>

            </main>

        </div>
    )
}

export default AdminFeedback