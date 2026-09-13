import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './Dashboard.css'
import FacebookEmbed from './FacebookEmbed'

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

function FeaturedCard({ post }) {
  return (
    <article key={post.id} className="featured-card">

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
            <span>
              Class {post.student_class} • {post.school}
            </span>
          </div>
        </div>
      </div>

    </article>
  )
}

function Dashboard() {
  const token = localStorage.getItem('access_token')

  const logout = () => {
    localStorage.removeItem('access_token')
    window.location.href = '/'
  }

  const isLoggedIn = !!token

  const [featuredPosts, setFeaturedPosts] = useState([])
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [user, setUser] = useState(null)

  const specialCarouselRef = useRef(null)
  const automaticCarouselRef = useRef(null)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    if (!token) return

    fetch('http://127.0.0.1:8000/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load user profile.')
        }

        return response.json()
      })
      .then((data) => setUser(data))
      .catch((error) => {
        console.error('Error fetching user profile:', error)
      })
  }, [token])

  useEffect(() => {
    fetch('http://127.0.0.1:8000/featured/')
      .then((response) => response.json())
      .then((data) => setFeaturedPosts(data))
      .catch((error) => {
        console.error('Error fetching featured posts:', error)
      })
  }, [])

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
    },
    {
      title: 'Drawing',
      description: 'Sketches, paintings & illustrations',
      type: 'Drawing',
      number: '02',
    },
    {
      title: 'Poem',
      description: 'Poetry & original compositions',
      type: 'Poem',
      number: '03',
    },
    {
      title: 'Song',
      description: 'Original songs & musical creations',
      type: 'Song',
      number: '04',
    },
    {
      title: 'Instrumental',
      description: 'Instrumental Performances',
      type: 'Instrumental',
      number: '05',
    },
    {
      title: 'Dance',
      description: 'Classical, contemporary & folk dance',
      type: 'Dance',
      number: '06',
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
      <nav className="dashboard-navbar">
        <Link to="/" className="dashboard-nav-logo">
          <img src="/Icons/logo.svg" alt="Logo" />
        </Link>

        <div className="dashboard-nav-links">

          <button className="language-button">
            <img src="/Icons/language.svg" alt="Language" />
          </button>

          {isLoggedIn ? (
            <>
              <Link to="/submit" className="submit-button">
                Submit
              </Link>

              <div className="profile-dropdown" ref={profileMenuRef}>

                <button
                  className="profile-dropdown-button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  aria-expanded={profileMenuOpen}
                >
                  <div className="profile-avatar">
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.name}
                      />
                    ) : (
                      <span>{getInitials(user?.name)}</span>
                    )}
                  </div>

                  <span className="profile-user-name">
                    {user?.name || 'Profile'}
                  </span>

                  <img
                      src="/Icons/dropdown.svg"
                      alt=""
                      className={`profile-dropdown-arrow ${
                          profileMenuOpen ? 'open' : ''
                      }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="profile-dropdown-menu">

                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <img src="/Icons/profile.svg" alt="Profile" />
                      <span>My Profile</span>
                    </Link>

                    <button
                      onClick={logout}
                    >
                      <span className="logout-icon">
                        <img src="/Icons/logout.svg" alt="Logout" />
                      </span>
                      <span>Logout</span>
                    </button>

                  </div>
                )}

              </div>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <main className="categories-section">
        <div className="section-label">
          • STUDENT CREATIVITY
        </div>

        <h1>Where does your talent belong?</h1>

        <p className="section-description">
          Share your creative work and reach readers, artists and
          audiences who appreciate student talent.
        </p>

        <div className="categories-grid">
          {categories.map((category) => (
            <Link
              key={category.type}
              to={`/category/${encodeURIComponent(category.type)}`}
              className={`category-card category-${category.number}`}
            >
              <div className="category-number">
                {category.number}
              </div>

              <div className="category-content">
                <span className="category-type">
                  {category.type}
                </span>

                <h2>{category.title}</h2>

                <p>{category.description}</p>

                <span className="category-link">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
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
                  />
                ))}
              </div>

            </div>
          )}

        </section>
      )}
    </div>
  )
}

export default Dashboard