import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import './AdminReports.css'
import AdminSidebar from '../components/AdminSidebar'

function AdminReports() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    const [selectedReport, setSelectedReport] = useState(null)
    const [changeMessage, setChangeMessage] = useState('')
    const [requestingChanges, setRequestingChanges] = useState(false)

    const token = localStorage.getItem('access_token')

    const fetchReports = async () => {
        try {
            const response = await fetch(
                `${API_URL}/admin/reports`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                throw new Error('Failed to fetch reports')
            }

            const data = await response.json()
            setReports(data)
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

        fetchReports()
    }, [])

    const updateReportStatus = async (reportId, status) => {
        try {
            const params = new URLSearchParams({
                status,
            })

            const response = await fetch(
                `${API_URL}/admin/reports/${reportId}?${params.toString()}`,
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
                    data.detail || 'Failed to update report'
                )
            }

            setReports(prev =>
                prev.map(report =>
                    report.id === reportId
                        ? { ...report, status }
                        : report
                )
            )
        } catch (error) {
            console.error(error)
            alert(error.message)
        }
    }

    const handleRequestChanges = async () => {
        if (!selectedReport || !changeMessage.trim()) {
            return
        }

        setRequestingChanges(true)

        try {
            const params = new URLSearchParams({
                message: changeMessage.trim(),
            })

            const response = await fetch(
                `${API_URL}/admin/reports/${selectedReport.id}/request-changes?${params.toString()}`,
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
                    'Failed to request changes'
                )
            }

            setReports(prev =>
                prev.map(report =>
                    report.id === selectedReport.id
                        ? {
                            ...report,
                            status: 'changes_requested'
                        }
                        : report
                )
            )

            setSelectedReport(null)
            setChangeMessage('')

            alert('Change request sent successfully.')
        } catch (error) {
            console.error(error)
            alert(error.message)
        } finally {
            setRequestingChanges(false)
        }
    }

    const handleDeletePost = async (submissionId) => {
        const confirmed = window.confirm(
            'Are you sure you want to permanently delete this post?'
        )

        if (!confirmed) {
            return
        }

        try {
            const response = await fetch(
                `${API_URL}/admin/posts/${submissionId}`,
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
                    data.detail || 'Failed to delete post'
                )
            }

            setReports(prev =>
                prev.filter(
                    report =>
                        report.submission_id !== submissionId
                )
            )

            alert('Post deleted successfully.')
        } catch (error) {
            console.error(error)
            alert(error.message)
        }
    }

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}
            <AdminSidebar
                admin={admin}
                activePage="reports"
                onLogout={handleLogout}
            />

            {/* MAIN CONTENT */}
            <main className="admin-main">

                <header className="admin-header">

                    <div>
                        <p className="admin-eyebrow">
                            ADMIN PANEL
                        </p>

                        <h1>Reports</h1>

                        <p className="admin-welcome">
                            Review reports submitted by users.
                        </p>
                    </div>

                </header>


                <section className="admin-section">

                    {loading ? (
                        <div className="admin-empty-state">
                            <p>Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="admin-empty-state">
                            <div className="admin-empty-icon">
                                ⚑
                            </div>

                            <h3>No reports</h3>

                            <p>
                                There are currently no reports
                                to review.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-reports-list">

                            {reports.map(report => (
                                <article
                                    key={report.id}
                                    className="admin-report-card"
                                >

                                    <div className="admin-report-top">

                                        <div>
                                            <p className="admin-panel-eyebrow">
                                                REPORT #{report.id}
                                            </p>

                                            <h2>
                                                {report.submission_heading}
                                            </h2>
                                        </div>

                                        <span
                                            className={`report-status report-status-${report.status}`}
                                        >
                                            {report.status.replace(
                                                '_',
                                                ' '
                                            )}
                                        </span>

                                    </div>


                                    <div className="admin-report-info">

                                        <p>
                                            <strong>
                                                Reason:
                                            </strong>{' '}
                                            {report.reason}
                                        </p>

                                        <p>
                                            <strong>
                                                Reported by:
                                            </strong>{' '}
                                            {report.reporter_name}
                                        </p>

                                        <p>
                                            <strong>
                                                Post author:
                                            </strong>{' '}
                                            {report.post_author_name}
                                        </p>

                                        {report.details && (
                                            <p>
                                                <strong>
                                                    Details:
                                                </strong>{' '}
                                                {report.details}
                                            </p>
                                        )}

                                        <p>
                                            <strong>
                                                Submitted:
                                            </strong>{' '}
                                            {new Date(
                                                report.created_at
                                            ).toLocaleString()}
                                        </p>

                                    </div>


                                    <div className="admin-report-actions">

                                        <button
                                            onClick={() => {
                                                setSelectedReport(
                                                    report
                                                )
                                                setChangeMessage('')
                                            }}
                                        >
                                            Request Changes
                                        </button>

                                        <button
                                            onClick={() =>
                                                updateReportStatus(
                                                    report.id,
                                                    'resolved'
                                                )
                                            }
                                        >
                                            Resolve
                                        </button>

                                        <button
                                            onClick={() =>
                                                updateReportStatus(
                                                    report.id,
                                                    'dismissed'
                                                )
                                            }
                                        >
                                            Dismiss
                                        </button>

                                        <button
                                            className="admin-danger-button"
                                            onClick={() =>
                                                handleDeletePost(
                                                    report.submission_id
                                                )
                                            }
                                        >
                                            Delete Post
                                        </button>

                                    </div>

                                </article>
                            ))}

                        </div>
                    )}

                </section>

            </main>


            {/* REQUEST CHANGES MODAL */}
            {selectedReport && (
                <div className="admin-modal-overlay">

                    <div className="admin-modal">

                        <div className="admin-modal-header">
                            <div>
                                <p className="admin-panel-eyebrow">
                                    REQUEST CHANGES
                                </p>

                                <h2>
                                    {selectedReport.submission_heading}
                                </h2>
                            </div>

                            <button
                                className="admin-modal-close"
                                onClick={() => {
                                    setSelectedReport(null)
                                    setChangeMessage('')
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <p className="admin-modal-description">
                            Send a message to{' '}
                            <strong>
                                {selectedReport.post_author_name}
                            </strong>{' '}
                            explaining what needs to be changed.
                        </p>

                        <textarea
                            value={changeMessage}
                            onChange={e =>
                                setChangeMessage(
                                    e.target.value
                                )
                            }
                            placeholder="Explain what the author needs to change..."
                            maxLength={1000}
                        />

                        <div className="admin-modal-footer">

                            <span>
                                {changeMessage.length}/1000
                            </span>

                            <div>

                                <button
                                    onClick={() => {
                                        setSelectedReport(null)
                                        setChangeMessage('')
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="admin-primary-button"
                                    disabled={
                                        requestingChanges ||
                                        !changeMessage.trim()
                                    }
                                    onClick={
                                        handleRequestChanges
                                    }
                                >
                                    {requestingChanges
                                        ? 'Sending...'
                                        : 'Send Request'}
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    )
}

export default AdminReports