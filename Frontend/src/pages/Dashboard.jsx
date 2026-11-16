import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from "../config";
import { useBackend } from '../BackendContext'
import './Dashboard.css'
import FacebookEmbed from './FacebookEmbed'
import Navbar from '../components/Navbar'
import SkeletonLoader from '../components/SkeletonLoader'
import BlogSection from '../components/BlogSection'
import SubmissionModal from '../components/SubmissionModal'

const isYouTubeUrl = (url) => {
  return url?.includes('youtube.com') || url?.includes('youtu.be')
}

const getYouTubeEmbedUrl = (url) => {
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0]
    return `https://www.youtube.com/embed/${id}`
  }

  if (url.includes('youtube.com/watch?v=')) {
    const id = new URL(url).searchParams.get('v')
    return `https://www.youtube.com/embed/${id}`
  }

  return url
}

const isGoogleDriveUrl = (url) => {
  return url?.includes('drive.google.com')
}

const getGoogleDrivePreviewUrl = (url) => {
  const match = url.match(/\/d\/([^/]+)/)

  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`
  }

  return url
}

const isFacebookUrl = (url) => {
  return url?.includes('facebook.com') || url?.includes('fb.watch')
}

function FeaturedCard({ post, onCardClick }) {
  return (
    <article
      key={post.id}
      className="featured-card"
      onClick={() => onCardClick?.(post)}
    >

      {post.also_top_post && (
        <div className="featured-card-badge">
          🏆 Top Post — {post.featured_month}
        </div>
      )}

      {post.media_url && (
        <div className="featured-card-media">
          {post.media_type?.startsWith('video/') &&
          !isYouTubeUrl(post.media_url) &&
          !isGoogleDriveUrl(post.media_url) &&
          !isFacebookUrl(post.media_url) ? (
            <video
              src={post.media_url}
              controls
              preload="metadata"
            />
          ) : isYouTubeUrl(post.media_url) ? (
            <iframe
              src={getYouTubeEmbedUrl(post.media_url)}
              title={post.heading}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isGoogleDriveUrl(post.media_url) ? (
            <iframe
              src={getGoogleDrivePreviewUrl(post.media_url)}
              title={post.heading}
              allow="autoplay"
              allowFullScreen
            />
          ) : isFacebookUrl(post.media_url) ? (
            <FacebookEmbed url={post.media_url} />
          ) : (
            <img src={post.media_url} alt={post.heading} />
          )}
        </div>
      )}

      <div className="featured-card-content">
        <span className="featured-card-category">
          {post.content_type}
        </span>

        <h3 className="featured-card-heading">{post.heading}</h3>

        {post.description && (
          <p>{post.description}</p>
        )}

        {post.written_content && (
          <div className="featured-card-written">
            {post.written_content}
          </div>
        )}

        <div className="featured-card-author">
          <div className="featured-card-avatar">
            {post.profile_picture ? (
              <img
                src={post.profile_picture}
                alt={post.student_name}
              />
            ) : (
              post.student_name?.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <strong>{post.student_name}</strong>
            {(post.student_class || post.school) && (
              <span>
                {[
                  post.student_class ? `Class ${post.student_class}` : null,
                  post.school
                ].filter(Boolean).join(' • ')}
              </span>
            )}
          </div>
        </div>
      </div>

    </article>
  )
}

function Dashboard() {
  const { backendLoading } = useBackend()

  const [token, setToken] = useState(() =>
    localStorage.getItem('access_token')
  )

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
    setToken(null)
    setUser(null)
  }

  const isLoggedIn = !!token

  const [featuredPosts, setFeaturedPosts] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user_info')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [allPublicSubmissions, setAllPublicSubmissions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const specialCarouselRef = useRef(null)
  const automaticCarouselRef = useRef(null)
  const profileMenuRef = useRef(null)
  const categorySliderRef = useRef(null)
  const progressBarRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragScrollLeftRef = useRef(0)
  const hasDraggedRef = useRef(false)

  const updateProgressBar = useCallback(() => {
    const slider = categorySliderRef.current
    if (!slider || !progressBarRef.current) return
    const maxScroll = slider.scrollWidth - slider.clientWidth
    const progress = maxScroll > 0 ? slider.scrollLeft / maxScroll : 0
    progressBarRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`
  }, [])

  const scrollCategorySlider = (direction) => {
    if (!categorySliderRef.current) return
    const container = categorySliderRef.current
    const card = container.querySelector('.showcase-category-card')
    const scrollAmount = card ? card.offsetWidth + 18 : 340
    container.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleSliderPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const slider = categorySliderRef.current
    if (!slider) return
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragStartXRef.current = e.clientX
    dragScrollLeftRef.current = slider.scrollLeft
  }

  const handleSliderPointerMove = (e) => {
    if (!isDraggingRef.current) return
    const slider = categorySliderRef.current
    if (!slider) return
    const diff = e.clientX - dragStartXRef.current
    if (Math.abs(diff) > 4) {
      hasDraggedRef.current = true
      slider.style.scrollBehavior = 'auto'
      slider.style.scrollSnapType = 'none'
      slider.classList.add('is-dragging')
      slider.scrollLeft = dragScrollLeftRef.current - diff
      updateProgressBar()
    }
  }

  const handleSliderPointerUp = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const slider = categorySliderRef.current
    if (slider) {
      slider.classList.remove('is-dragging')
      slider.style.scrollBehavior = 'smooth'
      slider.style.scrollSnapType = 'x mandatory'
      updateProgressBar()
    }
    setTimeout(() => {
      hasDraggedRef.current = false
    }, 80)
  }

  useEffect(() => {
    updateProgressBar()
    window.addEventListener('resize', updateProgressBar)
    return () => window.removeEventListener('resize', updateProgressBar)
  }, [updateProgressBar])

  useEffect(() => {
    if (!token || backendLoading) return

    fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user_info')
          setToken(null)
          setUser(null)
          return null
        }

        if (!response.ok) {
          throw new Error('Could not load user profile.')
        }

        return response.json()
      })
      .then((data) => {
        if (data) {
          setUser(data)
          localStorage.setItem('user_info', JSON.stringify(data))
        }
      })
      .catch((error) => {
        console.error('Error fetching user profile:', error)
      })
  }, [token, backendLoading])

  useEffect(() => {
    if (backendLoading) return

    fetch(`${API_URL}/featured/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load featured posts.')
        }

        return response.json()
      })
      .then((data) => {
        setFeaturedPosts(data)
      })
      .catch((error) => {
        console.error('Error fetching featured posts:', error)
      })
  }, [backendLoading])

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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

  const scrollCarousel = (ref, direction) => {
    if (!ref.current) return

    ref.current.scrollBy({
      left: direction * 360,
      behavior: 'smooth',
    })
  }

  const categories = [
    {
      title: 'Writing',
      description: 'Stories, essays & creative writing',
      type: 'Writing',
      number: '01',
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
      icon: '/Icons/writing.svg',
    },
    {
      title: 'Drawing',
      description: 'Sketches, paintings & illustrations',
      type: 'Drawing',
      number: '02',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80',
      icon: '/Icons/drawing.svg',
    },
    {
      title: 'Poetry',
      description: 'Poetry & original compositions',
      type: 'Poem',
      number: '03',
      image: 'https://images.unsplash.com/photo-1649832708151-8221e8cc9e96?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      icon: '/Icons/poem.svg',
    },
    {
      title: 'Song',
      description: 'Original songs & musical creations',
      type: 'Song',
      number: '04',
      image: '/music.png',
      icon: '/Icons/song.svg',
    },
    {
      title: 'Instrumental',
      description: 'Instrumental performances',
      type: 'Instrumental',
      number: '05',
      image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=80',
      icon: '/Icons/instrument.svg',
    },
    {
      title: 'Dance',
      description: 'Classical, contemporary & folk dance',
      type: 'Dance',
      number: '06',
      image: '/dance-card.png',
      icon: '/Icons/dance.svg',
    },
  ]

  const specialPosts = featuredPosts.filter(
    (post) => post.feature_type === 'special'
  )

  const automaticPosts = featuredPosts.filter(
    (post) => post.feature_type === 'automatic'
  )

  const getInitials = (name) => {
    if (!name) return '?'

    const parts = name.trim().split(/\s+/)

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase()
  }

  return (
    <div className="magazine">

      <Navbar theme="dark" />

      {searchOpen && (
        <div className="dash-search-overlay">
          <div className="dash-search-box" ref={searchRef}>

            <div className="dash-search-input-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults.length > 0) {
                    const submission = searchResults[0]

                    window.location.href = `/category/${encodeURIComponent(
                      submission.content_type
                    )}?post=${submission.share_token}`
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
              <div className="dash-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className="dash-search-result-item"
                      onClick={() => {
                        window.location.href = `/category/${encodeURIComponent(
                          submission.content_type
                        )}?post=${submission.share_token}`
                      }}
                    >
                      <strong>{submission.heading || 'Untitled'}</strong>
                      <span>
                        {submission.content_type} · {submission.student_name || 'Academic Arc'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="dash-search-no-results">
                    No submissions found.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <main className="showcase-section">
        <div className="showcase-card">
          {/* HERO ROW */}
          <div className="showcase-hero">
            <div className="showcase-hero-content">
              <div className="showcase-badge">
                <span className="showcase-badge-star">✦</span> STUDENT CREATIVITY
              </div>

              <h1 className="showcase-title">
                Student <span className="showcase-talent-text">Talent</span> Showcase
              </h1>

              <p className="showcase-description">
                Create, share and inspire with writing, poetry, drawing, music and other original student creations.
              </p>

              <div className="showcase-actions">
                <Link to="/category/All" className="showcase-btn showcase-btn-primary">
                  Explore All Creations <span className="showcase-btn-arrow">→</span>
                </Link>

                <Link to="/submit" className="showcase-btn showcase-btn-secondary">
                  + Add Post
                </Link>
              </div>
            </div>
          </div>

          {/* SLIDER SECTION (3 CARDS VISIBLE + DRAG/SWIPE + ARROWS BESIDE CARDS) */}
          <div className="showcase-slider-container">
            <div className="showcase-slider-wrapper">
              <button
                type="button"
                className="showcase-slider-arrow showcase-slider-prev"
                onClick={() => scrollCategorySlider(-1)}
                aria-label="Previous categories"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div
                className="showcase-slider"
                ref={categorySliderRef}
                onScroll={updateProgressBar}
                onPointerDown={handleSliderPointerDown}
                onPointerMove={handleSliderPointerMove}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onMouseLeave={handleSliderPointerUp}
              >
                {categories.map((category) => (
                  <Link
                    key={category.type}
                    to={`/category/${encodeURIComponent(category.type)}`}
                    className="showcase-category-card"
                    style={{ backgroundImage: `url(${category.image})` }}
                    onClick={(e) => {
                      if (hasDraggedRef.current) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <div className="showcase-card-overlay" />

                    <div className="showcase-card-bottom">
                      <div className="showcase-card-info">
                        <h3 className="showcase-card-title">{category.title}</h3>
                        <p className="showcase-card-desc">{category.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <button
                type="button"
                className="showcase-slider-arrow showcase-slider-next"
                onClick={() => scrollCategorySlider(1)}
                aria-label="Next categories"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* SLIDER PROGRESS BAR */}
            <div className="showcase-progress-track">
              <div className="showcase-progress-bar" ref={progressBarRef} />
            </div>
          </div>
        </div>
      </main>

      {featuredPosts.length > 0 && (
        <section className="featured-section">

          {/* SPECIAL MENTIONS */}
          {specialPosts.length > 0 && (
            <div className="featured-group">

              <div className="featured-section-header">
                <div>
                  <div className="section-label">
                    • FEATURED
                  </div>

                  <h2>Special Mentions</h2>

                  <p>
                    Discover student work specially selected by Academic Arc.
                  </p>
                </div>

                <div className="featured-carousel-controls">
                    <button
                        onClick={() => scrollCarousel(specialCarouselRef, -1)}
                        aria-label="Previous special mentions"
                    >
                        <img
                            src="/Icons/dropdown.svg"
                            alt=""
                            className="carousel-arrow previous"
                        />
                    </button>

                    <button
                        onClick={() => scrollCarousel(specialCarouselRef, 1)}
                        aria-label="Next special mentions"
                    >
                        <img
                            src="/Icons/dropdown.svg"
                            alt=""
                            className="carousel-arrow next"
                        />
                    </button>
                </div>
              </div>

              <div
                className="featured-carousel"
                ref={specialCarouselRef}
              >
                {specialPosts.map((post) => (
                  <FeaturedCard
                    key={post.id}
                    post={post}
                    onCardClick={setSelectedSubmission}
                  />
                ))}
              </div>

            </div>
          )}

          {/* AUTOMATIC TOP POSTS */}
          {automaticPosts.length > 0 && (
            <div className="featured-group automatic-featured-group">

              <div className="featured-section-header">
                <div>
                  <div className="section-label">
                    • TOP POSTS
                  </div>

                  <h2>
                    Top Posts — {automaticPosts[0].featured_month}
                  </h2>

                  <p>
                    The most-liked submissions from the previous month.
                  </p>
                </div>

                <div className="featured-carousel-controls">
                    <button
                        onClick={() => scrollCarousel(automaticCarouselRef, -1)}
                        aria-label="Previous top posts"
                    >
                        <img
                            src="/Icons/dropdown.svg"
                            alt=""
                            className="carousel-arrow previous"
                        />
                    </button>

                    <button
                        onClick={() => scrollCarousel(automaticCarouselRef, 1)}
                        aria-label="Next top posts"
                    >
                        <img
                            src="/Icons/dropdown.svg"
                            alt=""
                            className="carousel-arrow next"
                        />
                    </button>
                </div>
              </div>

              <div
                className="featured-carousel"
                ref={automaticCarouselRef}
              >
                {automaticPosts.map((post) => (
                  <FeaturedCard
                    key={post.id}
                    post={post}
                    onCardClick={setSelectedSubmission}
                  />
                ))}
              </div>

            </div>
          )}

        </section>
      )}

      {/* EDITORIAL BLOG SECTION (BELOW FEATURED) */}
      <BlogSection />

      {/* SUBMISSION VIEWER POPUP MODAL */}
      {selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onDelete={(id) => {
            setSpecialPosts((prev) => prev.filter((p) => p.id !== id))
            setAutomaticPosts((prev) => prev.filter((p) => p.id !== id))
          }}
        />
      )}
    </div>
  )
}

export default Dashboard