import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { API_URL } from "../config"
import './Category.css'
import FacebookEmbed from './FacebookEmbed'
import CategorySidebar from '../components/CategorySidebar'
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

function Category() {
  const { type } = useParams()
  const navigate = useNavigate()
  const categoryName = decodeURIComponent(type)
  const { showAlert, showConfirm, showToast } = usePrompt()

  const isLoggedIn = !!localStorage.getItem('access_token')

  const [submissions, setSubmissions] = useState([])
  const [likeData, setLikeData] = useState({})
  const [liking, setLiking] = useState({})
  const [commentCounts, setCommentCounts] = useState({})

  const [activeComments, setActiveComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [isPresetOpen, setIsPresetOpen] = useState(false)
  const [activePresetCategory, setActivePresetCategory] = useState('positive')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [ownSubmissionIds, setOwnSubmissionIds] = useState(new Set())
  const [openMenu, setOpenMenu] = useState(null)

  const [reportSubmission, setReportSubmission] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSubmission, setSelectedSubmission] = useState(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [allPublicSubmissions, setAllPublicSubmissions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const menuRef = useRef(null)
  const searchRef = useRef(null)

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!isLoggedIn) return

    fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load user profile.')
        }

        return response.json()
      })
      .then((data) => {
        setUser(data)
      })
      .catch((error) => {
        console.error('Error fetching user profile:', error)
      })
  }, [isLoggedIn])

  useEffect(() => {
    const categoryTitles = {
      Writing: 'Writing – Student Talent | Academic Arc',
      Drawing: 'Drawing – Student Talent | Academic Arc',
      Poem: 'Poetry – Student Talent | Academic Arc',
      Song: 'Song – Student Talent | Academic Arc',
      Instrumental: 'Instrumental – Student Talent | Academic Arc',
      Dance: 'Dance – Student Talent | Academic Arc',
    }

    const categoryDescriptions = {
      Writing:
        'Explore original stories, essays and creative writing by students on Academic Arc.',
      Drawing:
        'Explore student sketches, paintings and illustrations on Academic Arc.',
      Poem:
        'Explore original poetry and compositions created by students on Academic Arc.',
      Song:
        'Discover original songs and musical creations by students on Academic Arc.',
      Instrumental:
        'Discover instrumental performances created and shared by students on Academic Arc.',
      Dance:
        'Explore classical, contemporary and folk dance performances by students on Academic Arc.',
    }

    document.title =
      categoryTitles[categoryName] ||
      `${categoryName} – Student Talent | Academic Arc`

    const description =
      categoryDescriptions[categoryName] ||
      `Explore student ${categoryName.toLowerCase()} submissions on Academic Arc.`

    let metaDescription = document.querySelector(
      'meta[name="description"]'
    )

    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.name = 'description'
      document.head.appendChild(metaDescription)
    }

    metaDescription.setAttribute('content', description)

    let canonical = document.querySelector('link[rel="canonical"]')

    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }

    canonical.setAttribute(
      'href',
      `https://academicarc.in/category/${encodeURIComponent(categoryName)}`
    )
  }, [categoryName])

  // Fetch public submissions

  useEffect(() => {
    fetch(`${API_URL}/submissions/public`)
      .then((response) => response.json())
      .then((data) => {
        const filtered = data
          .filter(
            (submission) =>
              submission.content_type === categoryName
          )
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
          )

        setSubmissions(filtered)

        const initialCommentCounts = {}
        data.forEach((sub) => {
          if (sub.id) {
            initialCommentCounts[sub.id] = sub.comment_count ?? 0
          }
        })
        setCommentCounts((prev) => ({ ...initialCommentCounts, ...prev }))
      })
      .catch((error) => {
        console.error('Error fetching submissions:', error)
      })
  }, [categoryName])

  useEffect(() => {
    if (!searchOpen || allPublicSubmissions.length > 0) return

    fetch(`${API_URL}/submissions/public`)
      .then((response) => response.json())
      .then((data) => {
        setAllPublicSubmissions(data)
      })
      .catch((error) => {
        console.error('Error fetching search data:', error)
      })
  }, [searchOpen])

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      setSearchResults([])
      return
    }

    const results = allPublicSubmissions.filter((submission) => {
      return (
        submission.heading?.toLowerCase().includes(query) ||
        submission.description?.toLowerCase().includes(query) ||
        submission.student_name?.toLowerCase().includes(query) ||
        submission.school?.toLowerCase().includes(query) ||
        submission.content_type?.toLowerCase().includes(query)
      )
    })

    setSearchResults(results)
  }, [searchQuery, allPublicSubmissions])

  // Open submission from shared URL

  useEffect(() => {
    const postToken = searchParams.get('post');

    const submission = submissions.find(
      (item) => item.share_token === postToken
    );

    if (submission) {
      setSelectedSubmission(submission);
      loadComments(submission.id);
    }
  }, [searchParams, submissions])

  // Fetch current user's submissions so ownership is determined
  // from the backend rather than trusting the public data.
  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setOwnSubmissionIds(new Set())
      return
    }

    fetch(`${API_URL}/submissions/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to fetch your submissions')
        }

        return response.json()
      })
      .then((data) => {
        setOwnSubmissionIds(
          new Set(data.map((submission) => submission.id))
        )
      })
      .catch((error) => {
        console.error('Error fetching own submissions:', error)
      })
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  useEffect(() => {
    const handleSearchOutsideClick = (event) => {
      if (
        searchOpen &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleSearchOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleSearchOutsideClick)
    }
  }, [searchOpen])

  const fetchLikes = async (submissionId) => {
    const token = localStorage.getItem('access_token')

    try {
      const headers = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `${API_URL}/submissions/${submissionId}/likes`,
        {
          headers,
        }
      )

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

  useEffect(() => {
    submissions.forEach((submission) => {
      fetchLikes(submission.id)
    })
  }, [submissions])

  const handleLike = async (submissionId) => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      showAlert('Please log in to like a post.', 'info')
      return
    }

    if (liking[submissionId]) return

    setLiking((prev) => ({
      ...prev,
      [submissionId]: true,
    }))

    const current = likeData[submissionId]

    try {
      const method = current?.liked_by_user ? 'DELETE' : 'POST'

      const response = await fetch(
        `${API_URL}/submissions/${submissionId}/like`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to update like'
        )
      }

      setLikeData((prev) => ({
        ...prev,
        [submissionId]: {
          submission_id: submissionId,
          like_count: data.like_count,
          liked_by_user: method === 'POST',
        },
      }))
    } catch (error) {
      console.error('Error updating like:', error)
    } finally {
      setLiking((prev) => ({
        ...prev,
        [submissionId]: false,
      }))
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'

    return name
      .trim()
      .charAt(0)
      .toUpperCase()
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
    setUser(null)
    setProfileMenuOpen(false)
    navigate('/login')
  }

  const handleShare = async (submission) => {
    const shareUrl =
      `${window.location.origin}${window.location.pathname}?post=${submission.share_token}`;

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

  const openPostPopup = (submission, openPresets = false) => {
    setSelectedSubmission(submission)
    setIsPresetOpen(openPresets)
    setSelectedPreset('')
    setActivePresetCategory('positive')
    loadComments(submission.id)
    fetchLikes(submission.id)
  }

  const handlePostComment = async () => {
    if (!selectedSubmission || !selectedPreset) return
    if (!isLoggedIn) {
      showToast('Please sign in to post a comment.', 'error')
      return
    }

    setSubmittingComment(true)
    try {
      const token = localStorage.getItem('access_token')
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
      const token = localStorage.getItem('access_token')
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

  const closeSubmissionViewer = () => {
    setSelectedSubmission(null)
    setActiveComments([])
    setIsPresetOpen(false)
    setSelectedPreset('')

    const newParams = new URLSearchParams(searchParams)
    newParams.delete('post')
    newParams.delete('submission')

    setSearchParams(newParams, { replace: true })
  }

  const handleMenuToggle = (submissionId) => {
    setOpenMenu((current) =>
      current === submissionId ? null : submissionId
    )
  }

  const handleDelete = async (submissionId) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this submission? This cannot be undone.'
    )

    if (!confirmed) return

    const token = localStorage.getItem('access_token')

    if (!token) {
      showAlert('Please log in to delete your post.', 'warning')
      return
    }

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
          data.detail || 'Unable to delete submission'
        )
      }

      setSubmissions((prev) =>
        prev.filter(
          (submission) => submission.id !== submissionId
        )
      )

      setLikeData((prev) => {
        const updated = { ...prev }
        delete updated[submissionId]
        return updated
      })

      setOpenMenu(null)
      showToast('Submission deleted successfully.', 'info')
    } catch (error) {
      console.error('Error deleting submission:', error)
      showAlert(error.message, 'error')
    }
  }

  const handleReport = async () => {
    if (!reportSubmission || !reportReason) return

    const token = localStorage.getItem('access_token')

    if (!token) {
      showAlert('Please log in to report a post.', 'warning')
      return
    }

    setReportSubmitting(true)

    try {
      const params = new URLSearchParams({
        submission_id: String(reportSubmission.id),
        reason: reportReason,
      })

      if (reportDetails.trim()) {
        params.append('details', reportDetails.trim())
      }

      const response = await fetch(
        `${API_URL}/reports/?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to submit report'
        )
      }

      showAlert({
        title: 'Report Submitted',
        message: 'Thank you. Your report has been submitted for review.',
        type: 'success'
      })

      setReportSubmission(null)
      setReportReason('')
      setReportDetails('')
      setOpenMenu(null)

    } catch (error) {
      console.error('Error submitting report:', error)
      showAlert(error.message, 'error')
    } finally {
      setReportSubmitting(false)
    }
  }

  const isVideoType = (submission) => {
    const type = submission.content_type?.toLowerCase()

    return (
      type === 'song' ||
      type === 'dance' ||
      type === 'instrumental'
    )
  }

  const isUploadedVideo = (url) => {
    if (!url) return false

    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
  }

  const getEmbedUrl = (url) => {
    if (!url) return null

    if (url.includes('youtube.com/watch')) {
      try {
        const videoId = new URL(url).searchParams.get('v')

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`
        }
      } catch {
        return null
      }
    }

    if (url.includes('youtu.be/')) {
      const videoId = url
        .split('youtu.be/')[1]
        .split(/[?&]/)[0]

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^/]+)/)

      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
      }

      try {
        const fileId = new URL(url).searchParams.get('id')

        if (fileId) {
          return `https://drive.google.com/file/d/${fileId}/preview`
        }
      } catch {
        return null
      }
    }

    return null
  }

  return (
    <div className="category-page">

      <div className="category-navbar">
        <Navbar theme="light" showLanguage={false} />
      </div>

      {searchOpen && (
        <div className="search-overlay">
          <div className="search-box" ref={searchRef}>

            <div className="search-input-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults.length > 0) {
                    const submission = searchResults[0]

                    openPostPopup(submission, false)
                    setSearchOpen(false)
                    setSearchQuery('')
                  }
                }}
                placeholder="Search Academic Arc..."
                autoFocus
              />

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
                aria-label="Close search"
              >
                ×
              </button>
            </div>

            {searchQuery.trim() && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className="search-result-item"
                      onClick={() => {
                        openPostPopup(submission, false)
                        setSearchOpen(false)
                        setSearchQuery('')
                      }}
                    >
                      <strong>{submission.heading || 'Untitled'}</strong>
                      <span>
                        {submission.content_type} · {submission.student_name || 'Academic Arc'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="search-no-results">
                    No submissions found.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <main className="category-container">

        <div className="category-layout">
          <CategorySidebar categoryName={categoryName} />

          <div className="category-main-column">
            <div className="category-heading">

              <img
                src={`/${categoryName.toLowerCase()}.png`}
                alt={categoryName}
              />

              <p>
                Explore student {categoryName.toLowerCase()} submissions.
              </p>

            </div>

            <div className="submission-scroll-area">

              {submissions.length === 0 ? (

                <p className="empty-category">
                  No {categoryName.toLowerCase()} submissions yet.
                </p>

              ) : (

                <div className="submission-feed">

                  {submissions.map((submission) => {

                    const videoType = isVideoType(submission)

                    const uploadedVideo = isUploadedVideo(
                      submission.media_url
                    )

                    const embedUrl = getEmbedUrl(
                      submission.media_url
                    )

                    const isOwner = ownSubmissionIds.has(
                      submission.id
                    )

                    return (

                      <article
                        key={submission.id}
                        className="submission-card"
                      >

                        {/* POST HEADER */}

                        <div className="submission-header">

                          <div className="submission-avatar">

                            {submission.profile_picture ? (

                              <img
                                src={submission.profile_picture}
                                alt={submission.student_name}
                              />

                            ) : (

                              submission.student_name
                                ? submission.student_name
                                    .charAt(0)
                                    .toUpperCase()
                                : 'S'

                            )}

                          </div>

                          <div className="submission-meta">

                            <strong>
                              {submission.student_name}
                            </strong>

                            {(submission.student_class || submission.school) && (
                              <span>
                                {[
                                  submission.student_class ? `Class ${submission.student_class}` : null,
                                  submission.school
                                ].filter(Boolean).join(' • ')}
                              </span>
                            )}

                            <small>
                              Published on{' '}
                              {submission.created_at &&
                                new Date(
                                  submission.created_at
                                ).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                            </small>

                          </div>

                          {/* THREE DOT MENU */}

                          <div
                            className="submission-menu-wrapper"
                            ref={
                              openMenu === submission.id
                                ? menuRef
                                : null
                            }
                          >

                            <button
                              type="button"
                              className="submission-menu-button"
                              onClick={() =>
                                handleMenuToggle(submission.id)
                              }
                              aria-label="Post options"
                              aria-expanded={
                                openMenu === submission.id
                              }
                            >
                              ⋯
                            </button>

                            {openMenu === submission.id && (

                              <div className="submission-menu-dropdown">

                                {isOwner ? (

                                  <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenMenu(null)
                                            navigate(
                                                `/submit?edit=${submission.id}`
                                            )
                                        }}
                                    >
                                        ✏️ Edit post
                                    </button>

                                    <button
                                      type="button"
                                      className="delete-option"
                                      onClick={() =>
                                        handleDelete(submission.id)
                                      }
                                    >
                                      <img
                                          src="/Icons/f7_trash.svg"
                                          alt="Delete"
                                      /> Delete post
                                    </button>
                                  </>

                                ) : (

                                  <button
                                    type="button"
                                    className="report-option"
                                    onClick={() => {
                                      if (!isLoggedIn) {
                                        showAlert('Please log in to report a post.', 'info')
                                        setOpenMenu(null)
                                        return
                                      }

                                      setReportSubmission(submission)
                                      setReportReason('')
                                      setReportDetails('')
                                      setOpenMenu(null)
                                    }}
                                  >
                                    🚩 Report post
                                  </button>

                                )}

                              </div>

                            )}

                          </div>

                        </div>

                        {/* IMAGE */}

                        {!videoType &&
                          submission.media_url && (

                            <div
                              className="submission-image"
                              onClick={() => openPostPopup(submission, false)}
                              style={{ cursor: 'pointer' }}
                            >

                              <img
                                src={submission.media_url}
                                alt={submission.heading}
                              />

                            </div>

                          )}

                        {/* NATIVE VIDEO UPLOAD */}

                        {videoType &&
                          uploadedVideo && (

                            <div className="submission-video">

                              <video controls>

                                <source
                                  src={submission.media_url}
                                />

                                Your browser does not support
                                video playback.

                              </video>

                            </div>

                          )}

                        {/* VIDEO LINK */}

                        {videoType &&
                          !uploadedVideo &&
                          embedUrl && (

                            <div className="submission-video">

                              <iframe
                                src={embedUrl}
                                title={submission.heading}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />

                            </div>

                          )}

                        {/* FACEBOOK */}

                        {videoType &&
                          !uploadedVideo &&
                          submission.media_url?.includes(
                            'facebook.com'
                          ) && (

                            <div className="submission-video">

                              <FacebookEmbed
                                url={submission.media_url}
                              />

                            </div>

                          )}

                        {/* UNSUPPORTED VIDEO LINK */}

                        {videoType &&
                          !uploadedVideo &&
                          !embedUrl &&
                          !submission.media_url?.includes(
                            'facebook.com'
                          ) &&
                          submission.media_url && (

                            <div className="submission-link">

                              <a
                                href={submission.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open video ↗
                              </a>

                            </div>

                          )}

                        {/* POST TEXT */}

                        <div className="submission-content">

                          <h2
                            onClick={() => openPostPopup(submission, false)}
                            style={{ cursor: 'pointer' }}
                          >
                            {submission.heading}
                          </h2>

                          {submission.description && (

                            <p>
                              {submission.description}
                            </p>

                          )}

                          {/* WRITING / POEM CONTENT */}

                          {submission.written_content && (

                            <div
                              className="written-content-box"
                              onClick={() => openPostPopup(submission, false)}
                              style={{ cursor: 'pointer' }}
                            >

                              <div className="written-content">
                                {submission.written_content}
                              </div>

                            </div>

                          )}

                          {/* POST ACTIONS */}

                          <div className="submission-actions">

                            <button
                              className={`submission-like ${
                                likeData[submission.id]?.liked_by_user
                                  ? 'liked'
                                  : ''
                              }`}
                              onClick={() =>
                                handleLike(submission.id)
                              }
                              disabled={
                                liking[submission.id]
                              }
                              aria-label="Like post"
                            >

                              <span className="like-icon-svg">
                                <img
                                  src={
                                    likeData[submission.id]?.liked_by_user
                                      ? '/Icons/LIKE.svg'
                                      : '/Icons/DISLIKE.svg'
                                  }
                                  alt={
                                    likeData[submission.id]?.liked_by_user
                                      ? 'Liked'
                                      : 'Like'
                                  }
                                />
                              </span>

                              <span>
                                {likeData[submission.id]?.like_count ?? 0}
                              </span>

                            </button>

                            {/* COMMENT */}

                            <button
                              className="submission-comment"
                              onClick={() =>
                                openPostPopup(submission, true)
                              }
                              aria-label="Comment on submission"
                            >
                              <img
                                src="/Icons/comment.svg"
                                alt="Comment"
                                className="submission-comment-icon"
                              />
                              <span>
                                {commentCounts[submission.id] ?? submission.comment_count ?? 0}
                              </span>
                            </button>

                            {/* SHARE */}

                            <button
                              className="submission-share"
                              onClick={() =>
                                handleShare(submission)
                              }
                              aria-label="Share submission"
                            >
                              <img
                                src="/Icons/share.svg"
                                alt="Share"
                              />
                            </button>

                          </div>

                        </div>

                      </article>

                    )
                  })}

                </div>

              )}
            </div>
          </div>

          <div className="category-discovery-space"></div>
        </div>

      </main>

      {/* REPORT MODAL */}

      {reportSubmission && (
        <div
          className="report-modal-overlay"
          onClick={() => {
            if (!reportSubmitting) {
              setReportSubmission(null)
              setReportReason('')
              setReportDetails('')
            }
          }}
        >

          <div
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="report-modal-header">

              <div>
                <h2>Report post</h2>
                <p>
                  Why are you reporting this post?
                </p>
              </div>

              <button
                type="button"
                className="report-modal-close"
                onClick={() => {
                  if (!reportSubmitting) {
                    setReportSubmission(null)
                    setReportReason('')
                    setReportDetails('')
                  }
                }}
                disabled={reportSubmitting}
                aria-label="Close report"
              >
                ×
              </button>

            </div>

            <div className="report-reasons">

              {[
                'Inappropriate or offensive content',
                'Harassment or bullying',
                'Copyright infringement',
                'Spam or misleading content',
                'Sexual or inappropriate content involving minors',
                'Violence or dangerous content',
                'Other',
              ].map((reason) => (

                <label
                  key={reason}
                  className={`report-reason ${
                    reportReason === reason
                      ? 'selected'
                      : ''
                  }`}
                >

                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(event) =>
                      setReportReason(event.target.value)
                    }
                    disabled={reportSubmitting}
                  />

                  <span>{reason}</span>

                </label>

              ))}

            </div>

            <div className="report-details">

              <label htmlFor="report-details-input">
                Additional details
                <span> (optional)</span>
              </label>

              <textarea
                id="report-details-input"
                value={reportDetails}
                onChange={(event) =>
                  setReportDetails(event.target.value)
                }
                placeholder="Tell us anything else that may help us review this report..."
                maxLength={1000}
                disabled={reportSubmitting}
              />

              <small>
                {reportDetails.length}/1000
              </small>

            </div>

            <div className="report-modal-actions">

              <button
                type="button"
                className="report-cancel-button"
                onClick={() => {
                  if (!reportSubmitting) {
                    setReportSubmission(null)
                    setReportReason('')
                    setReportDetails('')
                  }
                }}
                disabled={reportSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="report-submit-button"
                onClick={handleReport}
                disabled={
                  !reportReason ||
                  reportSubmitting
                }
              >
                {reportSubmitting
                  ? 'Submitting...'
                  : 'Submit report'}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* FLOATING SUBMISSION VIEWER */}

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

            {/* MEDIA */}

            <div className="submission-viewer-media">

              {isUploadedVideo(
                selectedSubmission.media_url
              ) ? (

                <video
                  src={selectedSubmission.media_url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />

              ) : selectedSubmission.media_url?.includes(
                'facebook.com'
              ) ? (

                <FacebookEmbed
                  url={selectedSubmission.media_url}
                />

              ) : getEmbedUrl(
                selectedSubmission.media_url
              ) ? (

                <iframe
                  src={getEmbedUrl(
                    selectedSubmission.media_url
                  )}
                  title={selectedSubmission.heading}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />

              ) : selectedSubmission.media_url ? (

                <img
                  src={selectedSubmission.media_url}
                  alt={selectedSubmission.heading}
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

            {/* DETAILS */}

            <div className="submission-viewer-details">

              <div className="submission-viewer-header">

                <div className="viewer-avatar">

                  {selectedSubmission.profile_picture ? (

                    <img
                      src={selectedSubmission.profile_picture}
                      alt={selectedSubmission.student_name}
                    />

                  ) : (

                    selectedSubmission.student_name
                      ?.charAt(0)
                      .toUpperCase() || 'S'

                  )}

                </div>

                <div>

                  <strong>
                    {selectedSubmission.student_name}
                  </strong>

                  <span>
                    {selectedSubmission.content_type}
                    {' · '}
                    {selectedSubmission.created_at &&
                      new Date(
                        selectedSubmission.created_at
                      ).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                  href={selectedSubmission.media_url}
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
                  {!isLoggedIn ? (
                    <div className="viewer-comment-signin-prompt">
                      <span>Log in to share encouraging feedback!</span>
                      <button
                        type="button"
                        className="signin-to-comment-btn"
                        onClick={() => navigate('/login', { state: { from: location.pathname } })}
                      >
                        Sign In
                      </button>
                    </div>
                  ) : !isPresetOpen ? (
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

export default Category