import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from '../config'
import FacebookEmbed from '../pages/FacebookEmbed'
import { usePrompt } from '../context/PromptContext'
import './SubmissionModal.css'

// Comment presets categories & templates
const COMMENT_PRESETS = {
  positive: [
    'Amazing work! Loved the creativity here.',
    'Brilliant effort, keep up the fantastic work!',
    'So inspiring! Truly exceptional talent.',
    'Beautifully done, this really made my day!',
    'Outstanding presentation and great attention to detail!',
  ],
  satisfactory: [
    'Good effort, keep practicing!',
    'Nice attempt, you are definitely on the right track.',
    'Well done! Looking forward to seeing your next piece.',
    'Good work! Practice will make it even better.',
  ],
  motivating: [
    'Good attempt, keep practicing and you will get better!',
    'Every mistake is a stepping stone to mastery. Keep pushing!',
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

const isUploadedVideo = (url) => {
  if (!url) return false
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    (clean.includes('/storage/v1/object/public/') &&
      !clean.endsWith('.jpg') &&
      !clean.endsWith('.jpeg') &&
      !clean.endsWith('.png') &&
      !clean.endsWith('.webp') &&
      !clean.endsWith('.gif'))
  )
}

const getEmbedUrl = (url) => {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/shorts/')) {
        return `https://www.youtube.com/embed/${u.pathname.split('/shorts/')[1]}`
      }
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '')
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    if (u.hostname.includes('drive.google.com')) {
      if (url.includes('/preview')) return url
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null
    }
  } catch {
    return null
  }
  return null
}

function SubmissionModal({
  submission,
  onClose,
  onLikeToggle,
  onCommentCountUpdate,
  initialOpenPresets = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showConfirm, showToast, showAlert } = usePrompt()

  const token = localStorage.getItem('access_token')
  const isLoggedIn = !!token

  let currentUser = null
  try {
    const saved = localStorage.getItem('user_info')
    if (saved) currentUser = JSON.parse(saved)
  } catch {
    currentUser = null
  }

  // Likes state
  const [likeState, setLikeState] = useState({
    liked_by_user: false,
    like_count: submission?.like_count || 0,
  })
  const [liking, setLiking] = useState(false)

  // Comments state
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [isPresetOpen, setIsPresetOpen] = useState(initialOpenPresets)
  const [activePresetCategory, setActivePresetCategory] = useState('positive')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Keep callback references stable across parent re-renders to prevent effect loops
  const onCommentCountUpdateRef = useRef(onCommentCountUpdate)
  useEffect(() => {
    onCommentCountUpdateRef.current = onCommentCountUpdate
  }, [onCommentCountUpdate])

  const onLikeToggleRef = useRef(onLikeToggle)
  useEffect(() => {
    onLikeToggleRef.current = onLikeToggle
  }, [onLikeToggle])

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Lock body scroll and handle Escape key
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Fetch likes on mount
  useEffect(() => {
    if (!submission?.id) return

    let isMounted = true
    const fetchLikes = async () => {
      try {
        const response = await fetch(`${API_URL}/submissions/${submission.id}/likes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted) {
          setLikeState({
            liked_by_user: data.liked_by_user,
            like_count: data.like_count,
          })
        }
      } catch (err) {
        console.error('Error fetching likes:', err)
      }
    }

    fetchLikes()
    return () => {
      isMounted = false
    }
  }, [submission?.id, token])

  // Fetch comments on mount
  useEffect(() => {
    if (!submission?.id) return

    let isMounted = true
    const fetchComments = async () => {
      setCommentsLoading(true)
      try {
        const response = await fetch(`${API_URL}/submissions/${submission.id}/comments`)
        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            setComments(data.comments || [])
            if (onCommentCountUpdateRef.current) {
              onCommentCountUpdateRef.current(submission.id, data.count ?? (data.comments || []).length)
            }
          }
        }
      } catch (err) {
        console.error('Error loading comments:', err)
      } finally {
        if (isMounted) setCommentsLoading(false)
      }
    }

    fetchComments()
    return () => {
      isMounted = false
    }
  }, [submission?.id])

  // Like toggle handler
  const handleLike = async () => {
    if (!isLoggedIn) {
      showAlert('Please log in to like a post.', 'info')
      return
    }

    if (liking) return
    setLiking(true)

    const method = likeState.liked_by_user ? 'DELETE' : 'POST'
    try {
      const response = await fetch(`${API_URL}/submissions/${submission.id}/like`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to update like status')

      const data = await response.json()
      const newLiked = data.liked
      const newCount = data.like_count

      setLikeState({
        liked_by_user: newLiked,
        like_count: newCount,
      })

      if (onLikeToggleRef.current) {
        onLikeToggleRef.current(submission.id, newLiked, newCount)
      }
    } catch (err) {
      console.error('Like error:', err)
      showToast('Could not update like. Please try again.', 'error')
    } finally {
      setLiking(false)
    }
  }

  // Share handler
  const handleShare = async () => {
    const shareUrl = submission.share_token
      ? `${window.location.origin}/category/${encodeURIComponent(submission.content_type || 'Art')}?post=${submission.share_token}`
      : window.location.href

    const shareData = {
      title: `${submission.heading} - Academic Arc`,
      text: submission.description || `Check out ${submission.student_name || 'this student'}'s work on Academic Arc!`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        showToast('Link copied to clipboard!', 'success')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err)
      }
    }
  }

  // Post comment handler
  const handlePostComment = async () => {
    if (!selectedPreset) return
    if (!isLoggedIn) {
      showToast('Please sign in to post a comment.', 'error')
      return
    }

    setSubmittingComment(true)
    try {
      const response = await fetch(`${API_URL}/submissions/${submission.id}/comments`, {
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

      setComments((prev) => [data.comment, ...prev])
      setSelectedPreset('')
      setIsPresetOpen(false)

      if (onCommentCountUpdateRef.current) {
        onCommentCountUpdateRef.current(submission.id, data.count)
      }
    } catch (err) {
      console.error('Error posting comment:', err)
      showToast(err.message || 'Failed to post comment.', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Delete comment handler
  const handleDeleteComment = async (commentId) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this comment?',
      'Delete Comment',
      'Delete',
      'Cancel'
    )
    if (!confirmed) return

    try {
      const response = await fetch(
        `${API_URL}/submissions/${submission.id}/comments/${commentId}`,
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
      showToast('Comment deleted.', 'info')

      setComments((prev) => prev.filter((c) => c.id !== commentId))

      if (onCommentCountUpdateRef.current) {
        onCommentCountUpdateRef.current(submission.id, data.count)
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      showToast(err.message || 'Failed to delete comment.', 'error')
    }
  }

  const authorName = submission.student_name || submission.user_name || 'Academic Arc Author'
  const authorAvatar =
    submission.profile_picture ||
    submission.user?.profile_picture ||
    (currentUser && (currentUser.user_id === submission.user_id || currentUser.id === submission.user_id)
      ? currentUser.profile_picture
      : null)
  const authorInitial = authorName.charAt(0).toUpperCase() || 'A'

  const formattedDate = submission.created_at
    ? new Date(submission.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

  return (
    <div className="submission-viewer-overlay" onClick={onClose}>
      <div className="submission-viewer" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="submission-viewer-close"
          onClick={onClose}
          aria-label="Close viewer"
        >
          ×
        </button>

        {/* MEDIA SECTION (LEFT) */}
        <div className="submission-viewer-media">
          {isUploadedVideo(submission.media_url) ? (
            <video
              src={submission.media_url}
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : submission.media_url?.includes('facebook.com') ? (
            <FacebookEmbed url={submission.media_url} />
          ) : getEmbedUrl(submission.media_url) ? (
            <iframe
              src={getEmbedUrl(submission.media_url)}
              title={submission.heading || 'Submission preview'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : submission.media_url ? (
            <img src={submission.media_url} alt={submission.heading || 'Submission'} />
          ) : submission.written_content ? (
            <div className="viewer-writing">{submission.written_content}</div>
          ) : (
            <div className="viewer-no-media">No preview available</div>
          )}
        </div>

        {/* DETAILS SECTION (RIGHT) */}
        <div className="submission-viewer-details">
          {/* AUTHOR HEADER */}
          <div className="submission-viewer-header">
            <div className="viewer-avatar">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} />
              ) : (
                authorInitial
              )}
            </div>

            <div>
              <strong>{authorName}</strong>
              <span>
                {submission.content_type || 'Creative Work'}
                {formattedDate && ` · ${formattedDate}`}
              </span>
            </div>
          </div>

          <h2>{submission.heading}</h2>

          {submission.description && (
            <p className="viewer-description">{submission.description}</p>
          )}

          {submission.media_url && (
            <a
              className="viewer-open-link"
              href={submission.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original ↗
            </a>
          )}

          {/* ACTIONS BAR (LIKE & SHARE) */}
          <div className="viewer-actions-bar">
            <button
              type="button"
              className={`submission-like ${likeState.liked_by_user ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={liking}
              aria-label="Like post"
            >
              <span className="like-icon-svg">
                <img
                  src={likeState.liked_by_user ? '/Icons/LIKE.svg' : '/Icons/DISLIKE.svg'}
                  alt={likeState.liked_by_user ? 'Liked' : 'Like'}
                />
              </span>
              <span>{likeState.like_count}</span>
            </button>

            <button
              type="button"
              className="submission-share"
              onClick={handleShare}
              aria-label="Share submission"
            >
              <img src="/Icons/share.svg" alt="Share" />
              <span>Share</span>
            </button>
          </div>

          {/* COMMENTS SECTION */}
          <div className="viewer-comments-section">
            <div className="viewer-comments-header">
              <h3>
                <span>💬 Comments</span>
                <span className="viewer-comments-count-badge">
                  {comments.length}
                </span>
              </h3>
            </div>

            {/* COMMENTS LIST */}
            <div className="viewer-comments-list">
              {commentsLoading ? (
                <div className="viewer-comments-loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="viewer-comments-empty">
                  <p>No comments yet</p>
                  <span>Select a preset comment below to share encouraging feedback!</span>
                </div>
              ) : (
                comments.map((comment) => {
                  const badge = getCategoryBadge(comment.category)
                  const isOwner =
                    currentUser &&
                    (currentUser.user_id === comment.user_id ||
                      currentUser.id === comment.user_id ||
                      currentUser.role === 'admin')
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
  )
}

export default SubmissionModal
