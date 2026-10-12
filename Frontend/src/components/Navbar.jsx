import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config'
import NotificationBell from './NotificationBell'
import './Navbar.css'

function Navbar({ theme = 'light', showLanguage = true }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const profileMenuRef = useRef(null)
  const searchRef = useRef(null)

  const getInitials = (name) => {
    if (!name) return 'U'

    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsLoggedIn(!!token)

    if (!token) {
      setUser(null)
      return
    }

    fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          localStorage.removeItem('access_token')
          setIsLoggedIn(false)
          setUser(null)
          throw new Error('Invalid or expired token')
        }

        return response.json()
      })
      .then((data) => {
        setUser(data)
        setIsLoggedIn(true)
      })
      .catch(() => {
        setUser(null)
        setIsLoggedIn(false)
      })
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false)
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const fetchSearchResults = async () => {
      try {
        const response = await fetch(`${API_URL}/submissions/public`)

        if (!response.ok) {
          throw new Error('Failed to fetch submissions')
        }

        const submissions = await response.json()

        const query = searchQuery.toLowerCase().trim()

        const filtered = submissions.filter((submission) => {
          return (
            submission.heading?.toLowerCase().includes(query) ||
            submission.student_name?.toLowerCase().includes(query) ||
            submission.content_type?.toLowerCase().includes(query)
          )
        })

        setSearchResults(filtered.slice(0, 8))
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      }
    }

    fetchSearchResults()
  }, [searchQuery])

  const logout = () => {
    localStorage.removeItem('access_token')
    setIsLoggedIn(false)
    setUser(null)
    setProfileMenuOpen(false)
    window.location.href = '/'
  }

  const openSubmission = (submission) => {
    window.location.href = `/category/${encodeURIComponent(
      submission.content_type
    )}?post=${submission.share_token}`
  }

  return (
    <>
      <nav className={`navbar navbar-${theme}`}>
        <Link to="/" className="navbar-logo">
          <img
            src={theme === 'light' ? '/Icons/Logo_Black.svg' : '/Icons/Logo.svg'}
            alt="Logo"
          />
        </Link>

        <div className="navbar-search-container"
          aria-label="Search"
          onClick={() => setSearchOpen((prev) => !prev)}
        >
          <button
            className="navbar-search-button"
          >
            <img src="/Icons/search.svg" alt="Search" />
          </button>

          <span className="navbar-search-placeholder">
            Search Academic Arc...
          </span>
        </div>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <NotificationBell theme={theme} />

              <div className="navbar-profile-dropdown" ref={profileMenuRef}>
                <button
                  className="navbar-profile-button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                >
                  <div className="navbar-profile-avatar">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt={user.name} />
                    ) : (
                      <span>{getInitials(user?.name)}</span>
                    )}
                  </div>

                  <span className="navbar-profile-name">
                    {user?.name || 'Profile'}
                  </span>

                  <img
                    src="/Icons/dropdown.svg"
                    alt=""
                    className={`navbar-profile-arrow ${
                      profileMenuOpen ? 'open' : ''
                    }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="navbar-profile-menu">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <img src="/Icons/profile.svg" alt="Profile" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/submit"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <img src="/Icons/submit.svg" alt="Submit" />
                      <span>Submit</span>
                    </Link>

                    <button onClick={logout}>
                      <span className="navbar-logout-icon">
                        <img src="/Icons/logout.svg" alt="Logout" />
                      </span>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="navbar-sign-in-button">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {searchOpen && (
        <div className={`navbar-search-overlay navbar-search-${theme}`}>
          <div className="navbar-search-box" ref={searchRef}>
            <div className="navbar-search-input-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults.length > 0) {
                    openSubmission(searchResults[0])
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
              <div className="navbar-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className="navbar-search-result-item"
                      onClick={() => openSubmission(submission)}
                    >
                      <strong>
                        {submission.heading || 'Untitled'}
                      </strong>

                      <span>
                        {submission.content_type} ·{' '}
                        {submission.student_name || 'Academic Arc'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="navbar-search-no-results">
                    No submissions found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar