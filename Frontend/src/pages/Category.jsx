import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { API_URL } from "../config";
import './Category.css'
import FacebookEmbed from './FacebookEmbed'

function Category() {
  const { type } = useParams()
  const navigate = useNavigate()
  const categoryName = decodeURIComponent(type)

  const [submissions, setSubmissions] = useState([])
  const [likeData, setLikeData] = useState({})
  const [liking, setLiking] = useState({})

  const [ownSubmissionIds, setOwnSubmissionIds] = useState(new Set())
  const [openMenu, setOpenMenu] = useState(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSubmission, setSelectedSubmission] = useState(null)

  const menuRef = useRef(null)

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
      })
      .catch((error) => {
        console.error('Error fetching submissions:', error)
      })
  }, [categoryName])

  // Open submission from shared URL

  useEffect(() => {
    const postToken = searchParams.get('post');

    const submission = submissions.find(
      (item) => item.share_token === postToken
    );

    if (submission) {
      setSelectedSubmission(submission);
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
      alert('Please log in to like a post.')
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
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error)
      }
    }
  }

  const closeSubmissionViewer = () => {
    setSelectedSubmission(null)

    const newParams = new URLSearchParams(searchParams)
    newParams.delete('post')

    setSearchParams(newParams, { replace: true })
  }

  const handleMenuToggle = (submissionId) => {
    setOpenMenu((current) =>
      current === submissionId ? null : submissionId
    )
  }

  const handleDelete = async (submissionId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this submission? This cannot be undone.'
    )

    if (!confirmed) return

    const token = localStorage.getItem('access_token')

    if (!token) {
      alert('Please log in to delete your post.')
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
    } catch (error) {
      console.error('Error deleting submission:', error)
      alert(error.message)
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

      <nav className="navbar">

        <Link to="/" className="nav-logo">
          Academic Arc
        </Link>

        <div className="nav-links">

          <Link to="/">
            Home
          </Link>

          <Link to="/profile">
            Profile
          </Link>

        </div>

      </nav>

      <main className="category-container">

        <div className="category-heading">

          <h1>
            {categoryName}
          </h1>

          <p>
            Explore student {categoryName.toLowerCase()} submissions.
          </p>

        </div>

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

                      <span>
                        Class {submission.student_class} • {submission.school}
                      </span>

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
                                    alt="Share"
                                /> Delete post
                              </button>
                            </>

                          ) : (

                            <div className="menu-no-actions">
                              No actions available
                            </div>

                          )}

                        </div>

                      )}

                    </div>

                  </div>

                  {/* IMAGE */}

                  {!videoType &&
                    submission.media_url && (

                      <div className="submission-image">

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

                    <h2>
                      {submission.heading}
                    </h2>

                    {submission.description && (

                      <p>
                        {submission.description}
                      </p>

                    )}

                    {/* WRITING / POEM CONTENT */}

                    {submission.written_content && (

                      <div className="written-content-box">

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
                      >

                        <span className="like-icon">
                          {likeData[submission.id]
                            ?.liked_by_user
                            ? '♥'
                            : '♡'}
                        </span>

                        <span>
                          {likeData[submission.id]
                            ?.like_count ?? 0}
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

      </main>

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

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default Category