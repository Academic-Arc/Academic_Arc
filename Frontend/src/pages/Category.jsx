import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './Category.css'
import FacebookEmbed from './FacebookEmbed'

function Category() {
  const { type } = useParams()
  const categoryName = decodeURIComponent(type)

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

  const [submissions, setSubmissions] = useState([])
  const [likeData, setLikeData] = useState({})
  const [liking, setLiking] = useState({})

  useEffect(() => {
    fetch('http://127.0.0.1:8000/submissions/public')
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

  const fetchLikes = async (submissionId) => {
    const token = localStorage.getItem('access_token')

    try {
      const headers = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `http://127.0.0.1:8000/submissions/${submissionId}/likes`,
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
        `http://127.0.0.1:8000/submissions/${submissionId}/like`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to update like')
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

    // YouTube
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

    // YouTube shortened URL
    if (url.includes('youtu.be/')) {
      const videoId = url
        .split('youtu.be/')[1]
        .split(/[?&]/)[0]

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Google Drive
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
                          ? submission.student_name.charAt(0).toUpperCase()
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
                            year: 'numeric'
                          })}
                      </small>

                    </div>


                    <span className="submission-menu">
                      •••
                    </span>

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

                  {videoType &&
                    !uploadedVideo &&
                    submission.media_url?.includes('facebook.com') && (

                      <div className="submission-video">

                        <FacebookEmbed url={submission.media_url} />

                      </div>

                  )}


                  {/* UNSUPPORTED VIDEO LINK */}

                  {videoType &&
                    !uploadedVideo &&
                    !embedUrl &&
                    !submission.media_url?.includes('facebook.com') &&
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

                    <div className="submission-actions">

                      <button
                        className={`submission-like ${
                          likeData[submission.id]?.liked_by_user
                            ? 'liked'
                            : ''
                        }`}
                        onClick={() => handleLike(submission.id)}
                        disabled={liking[submission.id]}
                      >
                        <span className="like-icon">
                          {likeData[submission.id]?.liked_by_user ? '♥' : '♡'}
                        </span>

                        <span>
                          {likeData[submission.id]?.like_count ?? 0}
                        </span>
                      </button>

                    </div>

                  </div>

                </article>

              )
            })}

          </div>

        )}

      </main>

    </div>
  )
}

export default Category