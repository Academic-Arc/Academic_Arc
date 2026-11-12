import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from "../config";
import './Profile.css'
import FacebookEmbed from './FacebookEmbed'
import Navbar from '../components/Navbar'
import { usePrompt } from '../context/PromptContext'

const COMMENT_PRESETS = {
    positive: [
        'Amazing work! Keep shining!',
        'Fantastic creativity and brilliant execution!',
        'Outstanding effort, absolutely loved this!',
        'Super talented! This is truly wonderful.',
        'Exceptionally beautiful and well thought out!',
        'Masterpiece! Really proud of your work!',
    ],
    satisfactory: [
        'Good effort! Keep it up!',
        'Nicely done! Shows good potential.',
        'Great attempt, nicely presented!',
        'Neat work! You are on the right track.',
        'Well executed, good attention to detail.',
    ],
    motivating: [
        'Great start! Keep practicing and you will get even better.',
        'Good attempt! Focus on the finer details next time.',
        "Don't stop here, every practice makes you stronger!",
        'Unique idea! With a little more polish, it will shine.',
        'Keep trying, persistence leads to greatness!',
        'Never give up, you learn something new with every attempt!',
    ],
}

const PRESET_CATEGORIES = [
    { id: 'positive', label: 'Positive', icon: '🌟' },
    { id: 'satisfactory', label: 'Satisfactory', icon: '👍' },
    { id: 'motivating', label: 'Negative (Motivating)', icon: '💪' },
]

const getCategoryBadge = (cat) => {
    if (cat === 'positive') return { label: 'Positive', icon: '🌟', className: 'pill-positive' }
    if (cat === 'satisfactory') return { label: 'Satisfactory', icon: '👍', className: 'pill-satisfactory' }
    return { label: 'Motivating', icon: '💪', className: 'pill-motivating' }
}

const formatCommentTime = (dateStr) => {
    if (!dateStr) return ''
    let isoStr = typeof dateStr === 'string' ? dateStr.trim() : ''
    if (isoStr && !isoStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(isoStr)) {
        isoStr += 'Z'
    }
    const date = new Date(isoStr)
    const now = new Date()
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Profile() {
    const token = localStorage.getItem('access_token')
    const navigate = useNavigate()
    const location = useLocation()
    const { showAlert, showConfirm, showToast } = usePrompt()

    const [user, setUser] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const [likeData, setLikeData] = useState({})
    const [liking, setLiking] = useState({})
    const [commentCounts, setCommentCounts] = useState({})

    const [activeComments, setActiveComments] = useState([])
    const [commentsLoading, setCommentsLoading] = useState(false)
    const [isPresetOpen, setIsPresetOpen] = useState(false)
    const [activePresetCategory, setActivePresetCategory] = useState('positive')
    const [selectedPreset, setSelectedPreset] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)

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
            openSubmissionViewer(submission)

            // Clear the navigation state so refreshing
            // doesn't reopen the same post.
            navigate('/profile', {
                replace: true,
                state: {}
            })
        }
    }, [location.state, submissions, navigate])

    const openSubmissionViewer = (submission) => {
        setSelectedSubmission(submission)
        setIsPresetOpen(false)
        setSelectedPreset('')
        setActivePresetCategory('positive')
        loadComments(submission.id)
        fetchLikes(submission.id)
    }

    const closeSubmissionViewer = () => {
        setSelectedSubmission(null)
        setActiveComments([])
        setIsPresetOpen(false)
        setSelectedPreset('')
    }

    const fetchLikes = async (submissionId) => {
        try {
            const response = await fetch(`${API_URL}/submissions/${submissionId}/likes`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!response.ok) return
            const data = await response.json()
            setLikeData((prev) => ({
                ...prev,
                [submissionId]: data,
            }))
        } catch (error) {
            console.error('Error fetching likes:', error)
        }
    }

    const handleLike = async (submissionId) => {
        if (!token) {
            showAlert('Please log in to like a post.', 'info')
            return
        }

        setLiking((prev) => ({
            ...prev,
            [submissionId]: true,
        }))

        const current = likeData[submissionId]
        const method = current?.liked_by_user ? 'DELETE' : 'POST'

        try {
            const response = await fetch(`${API_URL}/submissions/${submissionId}/like`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.detail || 'Could not update like status.')
            }

            const data = await response.json()
            setLikeData((prev) => ({
                ...prev,
                [submissionId]: {
                    like_count: data.like_count,
                    liked_by_user: method === 'POST',
                },
            }))
        } catch (error) {
            console.error('Like error:', error)
            showToast(error.message || 'Failed to update like.', 'error')
        } finally {
            setLiking((prev) => ({
                ...prev,
                [submissionId]: false,
            }))
        }
    }

    const handleShare = async (submission) => {
        const shareUrl = submission.share_token
            ? `${window.location.origin}/category/${encodeURIComponent(submission.content_type)}?post=${submission.share_token}`
            : `${window.location.origin}/category/${encodeURIComponent(submission.content_type)}`

        const shareData = {
            title: submission.heading,
            text: `Check out ${submission.heading} on Academic Arc!`,
            url: shareUrl,
        }

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData)
            } else {
                await navigator.clipboard.writeText(shareUrl)
                showToast('Link copied to clipboard!', 'success')
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error)
            }
        }
    }

    const loadComments = async (submissionId) => {
        setCommentsLoading(true)
        try {
            const response = await fetch(`${API_URL}/submissions/${submissionId}/comments`)
            if (response.ok) {
                const data = await response.json()
                setActiveComments(data.comments || [])
                setCommentCounts((prev) => ({
                    ...prev,
                    [submissionId]: data.count ?? (data.comments?.length || 0),
                }))
            }
        } catch (err) {
            console.error('Error loading comments:', err)
        } finally {
            setCommentsLoading(false)
        }
    }

    const handlePostComment = async () => {
        if (!selectedSubmission || !selectedPreset) return

        setSubmittingComment(true)
        try {
            const response = await fetch(`${API_URL}/submissions/${selectedSubmission.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    category: activePresetCategory,
                    comment_text: selectedPreset,
                }),
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.detail || 'Could not post comment.')
            }

            const data = await response.json()
            showToast('Comment posted successfully!', 'success')

            setActiveComments((prev) => [data.comment, ...prev])
            setCommentCounts((prev) => ({
                ...prev,
                [selectedSubmission.id]: data.count,
            }))
            setSelectedPreset('')
            setIsPresetOpen(false)
        } catch (err) {
            console.error('Error posting comment:', err)
            showToast(err.message || 'Failed to post comment.', 'error')
        } finally {
            setSubmittingComment(false)
        }
    }

    const handleDeleteComment = async (commentId) => {
        if (!selectedSubmission) return
        const confirmed = await showConfirm(
            'Are you sure you want to delete this comment?',
            'Delete Comment',
            'Delete',
            'Cancel'
        )
        if (!confirmed) return

        try {
            const response = await fetch(
                `${API_URL}/submissions/${selectedSubmission.id}/comments/${commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.detail || 'Could not delete comment.')
            }

            const data = await response.json()
            showToast('Comment deleted.', 'success')

            setActiveComments((prev) => prev.filter((c) => c.id !== commentId))
            setCommentCounts((prev) => ({
                ...prev,
                [selectedSubmission.id]: data.count,
            }))
        } catch (err) {
            console.error('Error deleting comment:', err)
            showToast(err.message || 'Failed to delete comment.', 'error')
        }
    }

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

    const handleEditSubmission = (submissionId) => {
        setOpenSubmissionMenu(null)

        navigate(
            `/submit?edit=${submissionId}`
        )
    }

    const handleDeleteSubmission = async (
        submissionId
    ) => {
        const confirmed = await showConfirm(
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
            showToast('Submission deleted successfully.', 'info')
        } catch (err) {
            console.error(
                'Error deleting submission:',
                err
            )

            showAlert(err.message, 'error')
        }
    }

    /*
     * ==========================
     * PROFILE FUNCTIONS
     * ==========================
     */

    const handleOAuthSetup = async () => {
        if (!oauthDob) {
            showAlert('Please enter your date of birth.', 'warning')
            return
        }

        if (!oauthPassword || !oauthConfirmPassword) {
            showAlert('Please enter and confirm your password.', 'warning')
            return
        }

        if (oauthPassword.length < 8) {
            showAlert('Password must be at least 8 characters long.', 'warning')
            return
        }

        if (oauthPassword !== oauthConfirmPassword) {
            showAlert('Passwords do not match.', 'warning')
            return
        }

        if (
            oauthIsStudent &&
            (!oauthSchool.trim() || !oauthStudentClass.trim())
        ) {
            showAlert('Please enter your school and class.', 'warning')
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
            showAlert(err.message, 'error')
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
                                            onClick={() => openSubmissionViewer(submission)}
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
                    onClick={closeSubmissionViewer}
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
                            onClick={closeSubmissionViewer}
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

                            {/* POPUP POST ACTIONS (LIKE & SHARE) */}
                            <div className="viewer-actions-bar">
                                <button
                                    className={`submission-like ${
                                        likeData[selectedSubmission.id]?.liked_by_user
                                            ? 'liked'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        handleLike(selectedSubmission.id)
                                    }
                                    disabled={
                                        liking[selectedSubmission.id]
                                    }
                                    aria-label="Like post"
                                >
                                    <span className="like-icon-svg">
                                        <img
                                            src={
                                                likeData[selectedSubmission.id]?.liked_by_user
                                                    ? '/Icons/LIKE.svg'
                                                    : '/Icons/DISLIKE.svg'
                                            }
                                            alt={
                                                likeData[selectedSubmission.id]?.liked_by_user
                                                    ? 'Liked'
                                                    : 'Like'
                                            }
                                        />
                                    </span>
                                    <span>
                                        {likeData[selectedSubmission.id]?.like_count ?? 0}
                                    </span>
                                </button>

                                <button
                                    className="submission-share"
                                    onClick={() =>
                                        handleShare(selectedSubmission)
                                    }
                                    aria-label="Share submission"
                                >
                                    <img
                                        src="/Icons/share.svg"
                                        alt="Share"
                                    />
                                    <span>Share</span>
                                </button>
                            </div>

                            {/* COMMENTS SECTION */}
                            <div className="viewer-comments-section">
                                <div className="viewer-comments-header">
                                    <h3>
                                        <span>💬 Comments</span>
                                        <span className="viewer-comments-count-badge">
                                            {activeComments.length}
                                        </span>
                                    </h3>
                                </div>

                                {/* COMMENTS LIST */}
                                <div className="viewer-comments-list">
                                    {commentsLoading ? (
                                        <div className="viewer-comments-loading">Loading comments...</div>
                                    ) : activeComments.length === 0 ? (
                                        <div className="viewer-comments-empty">
                                            <p>No comments yet</p>
                                            <span>Select a preset comment below to share encouraging feedback!</span>
                                        </div>
                                    ) : (
                                        activeComments.map((comment) => {
                                            const badge = getCategoryBadge(comment.category)
                                            const isOwner = user && (user.id === comment.user_id || user.role === 'admin')
                                            return (
                                                <div key={comment.id} className="viewer-comment-item">
                                                    <div className="comment-user-avatar">
                                                        {comment.profile_picture ? (
                                                            <img src={comment.profile_picture} alt={comment.user_name} />
                                                        ) : (
                                                            comment.user_name?.charAt(0).toUpperCase() || 'U'
                                                        )}
                                                    </div>
                                                    <div className="comment-body">
                                                        <div className="comment-meta">
                                                            <strong className="comment-author">{comment.user_name}</strong>
                                                            <span className={`comment-category-pill ${badge.className}`}>
                                                                {badge.icon} {badge.label}
                                                            </span>
                                                            <span className="comment-time">
                                                                {formatCommentTime(comment.created_at)}
                                                            </span>
                                                            {isOwner && (
                                                                <button
                                                                    type="button"
                                                                    className="comment-delete-btn"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    title="Delete comment"
                                                                >
                                                                    <img src="/Icons/f7_trash.svg" alt="Delete" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="comment-text-bubble">
                                                            {comment.comment_text}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* ADD COMMENT PRESET PICKER */}
                                <div className="viewer-add-comment-wrapper">
                                    {!isPresetOpen ? (
                                        <button
                                            type="button"
                                            className="open-presets-trigger-btn"
                                            onClick={() => setIsPresetOpen(true)}
                                        >
                                            <span className="open-presets-icon">💬</span>
                                            <span className="open-presets-placeholder">Choose a preset comment to share...</span>
                                            <span className="open-presets-action-label">Add Comment</span>
                                        </button>
                                    ) : (
                                        <div className="preset-picker-panel">
                                            <div className="preset-picker-header">
                                                <span className="preset-picker-title">Select a preset comment:</span>
                                                <button
                                                    type="button"
                                                    className="preset-picker-close-btn"
                                                    onClick={() => {
                                                        setIsPresetOpen(false)
                                                        setSelectedPreset('')
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Category tabs */}
                                            <div className="preset-category-tabs">
                                                {PRESET_CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        className={`preset-tab tab-${cat.id} ${
                                                            activePresetCategory === cat.id ? 'active' : ''
                                                        }`}
                                                        onClick={() => {
                                                            setActivePresetCategory(cat.id)
                                                            setSelectedPreset('')
                                                        }}
                                                    >
                                                        <span>{cat.icon}</span> {cat.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Presets list */}
                                            <div className="preset-options-list">
                                                {COMMENT_PRESETS[activePresetCategory]?.map((presetText) => {
                                                    const isSelected = selectedPreset === presetText
                                                    return (
                                                        <button
                                                            key={presetText}
                                                            type="button"
                                                            className={`preset-option-chip ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => setSelectedPreset(presetText)}
                                                        >
                                                            <span className="preset-check-icon">
                                                                {isSelected ? '✓' : '•'}
                                                            </span>
                                                            <span className="preset-chip-text">{presetText}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Footer */}
                                            <div className="preset-picker-footer">
                                                <div className="preset-selected-preview">
                                                    {selectedPreset ? (
                                                        <span className="preview-text">"{selectedPreset}"</span>
                                                    ) : (
                                                        <span className="preview-prompt">Tap a preset above to choose it</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="post-comment-btn"
                                                    disabled={!selectedPreset || submittingComment}
                                                    onClick={handlePostComment}
                                                >
                                                    {submittingComment ? 'Posting...' : 'Post Comment'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    )
}

export default Profile