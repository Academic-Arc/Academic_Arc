import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from "../config";
import './Profile.css'
import FacebookEmbed from './FacebookEmbed'
import Navbar from '../components/Navbar'

function Profile() {
    const token = localStorage.getItem('access_token')
    const navigate = useNavigate()
    const location = useLocation()

    const [user, setUser] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const [openSubmissionMenu, setOpenSubmissionMenu] = useState(null)
    const submissionMenuRef = useRef(null)

    const [selectedSubmission, setSelectedSubmission] = useState(null)

    const isOAuthSetup =
        new URLSearchParams(location.search).get('oauth_setup') === 'true'

    const [oauthIsStudent, setOauthIsStudent] = useState(false)
    const [oauthDob, setOauthDob] = useState('')
    const [oauthSchool, setOauthSchool] = useState('')
    const [oauthStudentClass, setOauthStudentClass] = useState('')
    const [oauthPassword, setOauthPassword] = useState('')
    const [oauthConfirmPassword, setOauthConfirmPassword] = useState('')
    const [oauthSubmitting, setOauthSubmitting] = useState(false)

    if (!token) {
        return <Navigate to="/login" replace />
    }

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [
                    profileResponse,
                    submissionsResponse
                ] = await Promise.all([
                    fetch(`${API_URL}/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch(`${API_URL}/submissions/`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ])

                if (!profileResponse.ok) {
                    throw new Error('Could not load profile.')
                }

                if (!submissionsResponse.ok) {
                    throw new Error('Could not load submissions.')
                }

                const profileData =
                    await profileResponse.json()

                const submissionsData =
                    await submissionsResponse.json()

                const sortedSubmissions = [...submissionsData].sort(
                    (a, b) =>
                        new Date(b.created_at) -
                        new Date(a.created_at)
                )

                setUser(profileData)
                setSubmissions(sortedSubmissions)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [token])

    useEffect(() => {
        const openSubmissionId = location.state?.openSubmissionId

        if (!openSubmissionId || submissions.length === 0) {
            return
        }

        const submission = submissions.find(
            (item) => item.id === openSubmissionId
        )

        if (submission) {
            setSelectedSubmission(submission)

            // Clear the navigation state so refreshing
            // doesn't reopen the same post.
            navigate('/profile', {
                replace: true,
                state: {}
            })
        }
    }, [location.state, submissions, navigate])

    /*
     * Close submission menu when clicking outside.
     */
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                submissionMenuRef.current &&
                !submissionMenuRef.current.contains(
                    event.target
                )
            ) {
                setOpenSubmissionMenu(null)
            }
        }

        document.addEventListener(
            'mousedown',
            handleOutsideClick
        )

        return () => {
            document.removeEventListener(
                'mousedown',
                handleOutsideClick
            )
        }
    }, [])

    const getInitial = () => {
        if (!user?.name) return '?'

        return user.name
            .trim()
            .charAt(0)
            .toUpperCase()
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''

        return new Date(dateString).toLocaleDateString(
            'en-US',
            {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            }
        )
    }

    /*
     * ==========================
     * SUBMISSION GRID HELPERS
     * ==========================
     */

    const isImage = (submission) => {
        const mediaType =
            submission.media_type?.toLowerCase() || ''

        const url =
            submission.media_url?.toLowerCase() || ''

        return (
            mediaType.includes('image') ||
            /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)
        )
    }

    const isVideo = (submission) => {
        const mediaType =
            submission.media_type?.toLowerCase() || ''

        const url =
            submission.media_url?.toLowerCase() || ''

        return (
            mediaType.includes('video') ||
            /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
        )
    }

    const isAudio = (submission) => {
        const mediaType =
            submission.media_type?.toLowerCase() || ''

        const url =
            submission.media_url?.toLowerCase() || ''

        return (
            mediaType.includes('audio') ||
            /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url)
        )
    }

    const getYoutubeId = (url) => {
        if (!url) return null

        const match = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/
        )

        return match ? match[1] : null
    }

    const getDriveId = (url) => {
        if (!url) return null

        const patterns = [
            /drive\.google\.com\/file\/d\/([^/]+)/,
            /drive\.google\.com\/open\?id=([^&]+)/,
            /drive\.google\.com\/uc\?id=([^&]+)/,
        ]

        for (const pattern of patterns) {
            const match = url.match(pattern)

            if (match) {
                return match[1]
            }
        }

        return null
    }

    const getLinkPlatform = (url) => {
        if (!url) return null

        const lowerUrl = url.toLowerCase()

        if (
            lowerUrl.includes('youtube.com') ||
            lowerUrl.includes('youtu.be')
        ) {
            return 'youtube'
        }

        if (lowerUrl.includes('facebook.com')) {
            return 'facebook'
        }

        if (lowerUrl.includes('drive.google.com')) {
            return 'drive'
        }

        return 'link'
    }

    const getLinkThumbnail = (submission) => {
        const url = submission.media_url

        if (!url) return null

        const platform = getLinkPlatform(url)

        if (platform === 'youtube') {
            const videoId = getYoutubeId(url)

            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            }
        }

        if (platform === 'drive') {
            const driveId = getDriveId(url)

            if (driveId) {
                return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
            }
        }

        return null
    }

    const getEmbedUrl = (submission) => {
        const url = submission.media_url

        if (!url) return null

        const platform = getLinkPlatform(url)

        if (platform === 'youtube') {
            const videoId = getYoutubeId(url)

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`
            }
        }

        if (platform === 'drive') {
            const driveId = getDriveId(url)

            if (driveId) {
                return `https://drive.google.com/file/d/${driveId}/preview`
            }
        }

        return null
    }

    const isExternalLink = (submission) => {
        const platform = getLinkPlatform(
            submission?.media_url
        )

        return (
            platform === 'youtube' ||
            platform === 'facebook' ||
            platform === 'drive'
        )
    }

    const getSubmissionIcon = (submission) => {
        switch (submission.content_type) {
            case 'Poem':
                return '✎'

            case 'Drawing':
                return '▧'

            case 'Writing':
                return '▤'

            case 'Song':
            case 'Instrumental':
            case 'Dance':
                return '♪'

            default:
                return '✦'
        }
    }

    const getCategoryClass = (submission) => {
        return (
            submission.content_type
                ?.toLowerCase()
                .replace(/\s+/g, '-') || ''
        )
    }

    const toggleSubmissionMenu = (submissionId) => {
        setOpenSubmissionMenu((current) =>
            current === submissionId
                ? null
                : submissionId
        )
    }

    const handleShare = async (submission) => {
        const shareUrl =
            `${window.location.origin}/category/${encodeURIComponent(
                submission.content_type
            )}?post=${submission.share_token}`

        const shareData = {
            title: submission.heading,
            text: submission.description || submission.heading,
            url: shareUrl,
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData)
            } else {
                await navigator.clipboard.writeText(shareUrl)
                alert('Link copied to clipboard!')
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error)
            }
        }
    }

    const handleEditSubmission = (submissionId) => {
        setOpenSubmissionMenu(null)

        navigate(
            `/submit?edit=${submissionId}`
        )
    }

    const handleDeleteSubmission = async (
        submissionId
    ) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this submission? This cannot be undone.'
        )

        if (!confirmed) return

        try {
            const response = await fetch(
                `${API_URL}/submissions/${submissionId}`,
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
                    'Could not delete submission.'
                )
            }

            setSubmissions((previous) =>
                previous.filter(
                    (submission) =>
                        submission.id !== submissionId
                )
            )

            setOpenSubmissionMenu(null)
        } catch (err) {
            console.error(
                'Error deleting submission:',
                err
            )

            alert(err.message)
        }
    }

    /*
     * ==========================
     * PROFILE FUNCTIONS
     * ==========================
     */

    const handleOAuthSetup = async () => {
        if (!oauthDob) {
            alert('Please enter your date of birth.')
            return
        }

        if (!oauthPassword || !oauthConfirmPassword) {
            alert('Please enter and confirm your password.')
            return
        }

        if (oauthPassword.length < 8) {
            alert('Password must be at least 8 characters long.')
            return
        }

        if (oauthPassword !== oauthConfirmPassword) {
            alert('Passwords do not match.')
            return
        }

        if (
            oauthIsStudent &&
            (!oauthSchool.trim() || !oauthStudentClass.trim())
        ) {
            alert('Please enter your school and class.')
            return
        }

        setOauthSubmitting(true)

        try {
            const response = await fetch(
                `${API_URL}/auth/oauth/setup`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        is_student: oauthIsStudent,
                        dob: oauthDob,
                        password: oauthPassword,
                        school: oauthIsStudent
                            ? oauthSchool.trim()
                            : null,
                        student_class: oauthIsStudent
                            ? oauthStudentClass.trim()
                            : null,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Could not complete account setup.'
                )
            }

            localStorage.setItem(
                'access_token',
                data.access_token
            )

            navigate('/dashboard', { replace: true })
        } catch (err) {
            alert(err.message)
        } finally {
            setOauthSubmitting(false)
        }
    }

    if (error) {
        return (
            <div className="profile-page">
                <p className="profile-error">
                    {error}
                </p>
            </div>
        )
    }

    if (loading || !user) {
        return (
            <div className="profile-page">
                <p className="profile-loading">
                    Loading profile...
                </p>
            </div>
        )
    }

    return (
        <div className="profile-page">

            {isOAuthSetup && (
                <div className="profile-modal-overlay">
                    <div
                        className="profile-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>
                                Complete Your Profile
                            </h2>
                        </div>

                        <div className="modal-content">

                            <p className="profile-edit-note">
                                Your Google account has been connected.
                                Please complete these details to finish
                                setting up your Academic Arc account.
                            </p>

                            <div className="form-group">
                                <label>
                                    Are you a student?
                                </label>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '10px',
                                        marginTop: '8px'
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={
                                            oauthIsStudent
                                                ? 'save-button'
                                                : 'cancel-button'
                                        }
                                        onClick={() =>
                                            setOauthIsStudent(true)
                                        }
                                    >
                                        Yes
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            !oauthIsStudent
                                                ? 'save-button'
                                                : 'cancel-button'
                                        }
                                        onClick={() =>
                                            setOauthIsStudent(false)
                                        }
                                    >
                                        No
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>
                                    Date of Birth
                                </label>

                                <input
                                    type="date"
                                    value={oauthDob}
                                    onChange={(event) =>
                                        setOauthDob(event.target.value)
                                    }
                                />
                            </div>

                            {oauthIsStudent && (
                                <>
                                    <div className="form-group">
                                        <label>
                                            School
                                        </label>

                                        <input
                                            type="text"
                                            value={oauthSchool}
                                            onChange={(event) =>
                                                setOauthSchool(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your school"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            Class
                                        </label>

                                        <input
                                            type="text"
                                            value={oauthStudentClass}
                                            onChange={(event) =>
                                                setOauthStudentClass(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your class"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label>
                                    Create Academic Arc Password
                                </label>

                                <input
                                    type="password"
                                    value={oauthPassword}
                                    onChange={(event) =>
                                        setOauthPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="At least 8 characters"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Confirm Password
                                </label>

                                <input
                                    type="password"
                                    value={oauthConfirmPassword}
                                    onChange={(event) =>
                                        setOauthConfirmPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Re-enter your password"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={handleOAuthSetup}
                                    disabled={oauthSubmitting}
                                >
                                    {oauthSubmitting
                                        ? 'Completing Setup...'
                                        : 'Complete Setup'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            <Navbar theme="light" showLanguage={false} />

            <div className="profile-container">

                <div className="profile-topbar">
                    <span>My Profile</span>
                </div>

                {/* PROFILE CARD */}

                <section className="profile-card">

                    <div className="profile-header">

                        <div className="profile-identity">

                            <div className="profile-picture">

                                {user.profile_picture ? (

                                    <img
                                        src={
                                            user.profile_picture
                                        }
                                        alt={`${user.name}'s profile`}
                                    />

                                ) : (

                                    <span>
                                        {getInitial()}
                                    </span>

                                )}

                            </div>

                            <div className="profile-name-area">

                                <h1>
                                    {user.name}
                                </h1>

                                <p>
                                    {user.email}
                                </p>

                            </div>

                        </div>

                        <button
                            className="edit-profile-button"
                            onClick={() => navigate('/profile/edit')}
                        >
                            Edit Profile
                        </button>

                    </div>

                    <div className="profile-details">

                        {user.student && (

                            <div className="profile-pill">

                                <span>🎓</span>

                                <span>
                                    Class{' '}
                                    {user.student.student_class}

                                    {user.student.school &&
                                        ` · ${user.student.school}`}
                                </span>

                            </div>

                        )}

                        {(user.village_locality ||
                            user.district) && (

                            <div className="profile-pill">

                                <span>📍</span>

                                <span>

                                    {user.village_locality}

                                    {user.village_locality &&
                                        user.district &&
                                        ', '}

                                    {user.district}

                                </span>

                            </div>

                        )}

                        <div className="profile-pill">

                            <span>📅</span>

                            <span>
                                Joined{' '}
                                {formatDate(
                                    user.created_at
                                )}
                            </span>

                        </div>

                    </div>

                </section>


                {/* SUBMISSIONS */}

                <section className="submissions-section">

                    <div className="section-heading">

                        <span>
                            YOUR WORK
                        </span>

                        <h2>
                            My Submissions (
                            {submissions.length}
                            )
                        </h2>

                    </div>

                    {submissions.length === 0 ? (

                        <div className="empty-submissions">

                            <p>
                                You haven't submitted
                                anything yet.
                            </p>

                        </div>

                    ) : (

                        <div className="submission-grid">

                            {submissions.map(
                                (submission) => {

                                    const image =
                                        isImage(
                                            submission
                                        )

                                    const video =
                                        isVideo(
                                            submission
                                        )

                                    const audio =
                                        isAudio(
                                            submission
                                        )

                                    const categoryClass =
                                        getCategoryClass(
                                            submission
                                        )

                                    const menuOpen =
                                        openSubmissionMenu ===
                                        submission.id

                                    return (

                                        <article
                                            className={`profile-submission-tile ${categoryClass}`}
                                            key={submission.id}
                                            onClick={() => setSelectedSubmission(submission)}
                                        >

                                            {/* TILE CONTENT */}

                                            <div className="submission-tile-content">

                                                {isImage(submission) && submission.media_url ? (

                                                    <img
                                                        src={submission.media_url}
                                                        alt={submission.heading}
                                                    />

                                                ) : isVideo(submission) &&
                                                    submission.media_url &&
                                                    !isExternalLink(submission) ? (

                                                    <video
                                                        src={submission.media_url}
                                                        muted
                                                        playsInline
                                                        preload="metadata"
                                                    />

                                                ) : getLinkPlatform(
                                                    submission.media_url
                                                ) === 'facebook' ? (

                                                    <div className="facebook-tile-preview">

                                                        <FacebookEmbed
                                                            url={submission.media_url}
                                                            className="facebook-grid-embed"
                                                        />

                                                    </div>

                                                ) : getLinkThumbnail(submission) ? (

                                                    <img
                                                        src={getLinkThumbnail(submission)}
                                                        alt={submission.heading}
                                                        onError={(event) => {
                                                            event.currentTarget.style.display =
                                                                'none'
                                                        }}
                                                    />

                                                ) : submission.media_url ? (

                                                    <div className="external-link-preview">

                                                        <div className="external-link-icon">
                                                            ↗
                                                        </div>

                                                        <strong>
                                                            {getLinkPlatform(
                                                                submission.media_url
                                                            ) === 'drive'
                                                                ? 'Google Drive'
                                                                : 'External Link'}
                                                        </strong>

                                                        <span>
                                                            {submission.heading}
                                                        </span>

                                                    </div>

                                                ) : (

                                                    <div className="submission-text-preview">

                                                        <div className="submission-preview-icon">
                                                            {getSubmissionIcon(submission)}
                                                        </div>

                                                        <h3>
                                                            {submission.heading}
                                                        </h3>

                                                        {submission.written_content && (
                                                            <p>
                                                                {submission.written_content}
                                                            </p>
                                                        )}

                                                    </div>

                                                )}

                                            </div>

                                            {/* HOVER / INFO OVERLAY */}

                                            <div className="submission-tile-overlay">

                                                <div className="submission-tile-info">

                                                    <strong>
                                                        {
                                                            submission.heading
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            submission.content_type
                                                        }
                                                    </span>

                                                </div>

                                            </div>


                                            {/* THREE DOTS */}

                                            <div
                                                className="profile-submission-menu"
                                                ref={
                                                    menuOpen
                                                        ? submissionMenuRef
                                                        : null
                                                }
                                            >

                                                <button
                                                    type="button"
                                                    className="profile-submission-menu-button"
                                                    onClick={(
                                                        event
                                                    ) => {

                                                        event.stopPropagation()

                                                        toggleSubmissionMenu(
                                                            submission.id
                                                        )

                                                    }}
                                                    aria-label="Submission options"
                                                    aria-expanded={
                                                        menuOpen
                                                    }
                                                >
                                                    ⋯
                                                </button>

                                                {menuOpen && (

                                                    <div className="profile-submission-dropdown">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleEditSubmission(
                                                                    submission.id
                                                                )
                                                            }
                                                        >
                                                            ✏️ Edit post
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="share-option"
                                                            onClick={() => {
                                                                setOpenSubmissionMenu(null)
                                                                handleShare(submission)
                                                            }}
                                                        >
                                                            <img
                                                                src="/Icons/share.svg"
                                                                alt="Share"
                                                            /> Share
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete-option"
                                                            onClick={() =>
                                                                handleDeleteSubmission(
                                                                    submission.id
                                                                )
                                                            }
                                                        >
                                                            <img
                                                                src="/Icons/f7_trash.svg"
                                                                alt="Delete"
                                                            /> Delete post
                                                        </button>

                                                    </div>

                                                )}

                                            </div>

                                        </article>

                                    )
                                }
                            )}

                        </div>

                    )}

                </section>

            </div>

            {/* Floating Post Cards */}

            {selectedSubmission && (
                <div
                    className="submission-viewer-overlay"
                    onClick={() => setSelectedSubmission(null)}
                >

                    <div
                        className="submission-viewer"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="submission-viewer-close"
                            onClick={() =>
                                setSelectedSubmission(null)
                            }
                        >
                            ×
                        </button>

                        <div className="submission-viewer-media">

                            {isImage(selectedSubmission) &&
                                selectedSubmission.media_url ? (

                                <img
                                    src={selectedSubmission.media_url}
                                    alt={selectedSubmission.heading}
                                />

                            ) : isVideo(selectedSubmission) &&
                                selectedSubmission.media_url &&
                                !isExternalLink(selectedSubmission) ? (

                                <video
                                    src={selectedSubmission.media_url}
                                    controls
                                    autoPlay
                                    playsInline
                                    preload="metadata"
                                />

                            ) : getLinkPlatform(
                                selectedSubmission.media_url
                            ) === 'facebook' ? (

                                <FacebookEmbed
                                    url={selectedSubmission.media_url}
                                />

                            ) : selectedSubmission.media_url &&
                                getEmbedUrl(selectedSubmission) ? (

                                <iframe
                                    src={getEmbedUrl(selectedSubmission)}
                                    title={selectedSubmission.heading}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />

                            ) : selectedSubmission.written_content ? (

                                <div className="viewer-writing">
                                    {selectedSubmission.written_content}
                                </div>

                            ) : (

                                <div className="viewer-no-media">
                                    No preview available
                                </div>

                            )}

                        </div>

                        <div className="submission-viewer-details">

                            <div className="submission-viewer-header">

                                <div className="viewer-avatar">
                                    {getInitial()}
                                </div>

                                <div>
                                    <strong>
                                        {user.name}
                                    </strong>

                                    <span>
                                        {selectedSubmission.content_type}
                                        {' · '}
                                        {formatDate(
                                            selectedSubmission.created_at
                                        )}
                                    </span>
                                </div>

                            </div>

                            <h2>
                                {selectedSubmission.heading}
                            </h2>

                            {selectedSubmission.description && (
                                <p className="viewer-description">
                                    {selectedSubmission.description}
                                </p>
                            )}

                            {selectedSubmission.media_url && (
                                <a
                                    className="viewer-open-link"
                                    href={
                                        selectedSubmission.media_url
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open original ↗
                                </a>
                            )}

                        </div>

                    </div>

                </div>
            )}

        </div>
    )
}

export default Profile