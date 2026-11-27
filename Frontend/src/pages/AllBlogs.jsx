import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import Navbar from '../components/Navbar'
import './AllBlogs.css'

function AllBlogs() {
  const navigate = useNavigate()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    let isMounted = true
    setLoading(true)
    setError(null)

    fetch(`${API_URL}/blogs/all`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load blogs.')
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setBlogs(data.blogs || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(blogs.map((b) => b.category).filter(Boolean))
    )
    return ['All', ...unique]
  }, [blogs])

  const filteredBlogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return blogs.filter((b) => {
      const matchesCategory =
        selectedCategory === 'All' || b.category === selectedCategory
      const matchesQuery =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.excerpt?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.author_name?.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [blogs, selectedCategory, searchQuery])

  return (
    <div className="all-blogs-page">
      <Navbar theme="light" showLanguage={false} />

      <main className="all-blogs-container">
        <div className="all-blogs-top-nav">
          <button
            type="button"
            className="all-blogs-back-btn"
            onClick={() => navigate('/')}
          >
            ← Back to Showcase
          </button>
        </div>

        <header className="all-blogs-header">
          <div className="all-blogs-label">• EDITORIAL</div>
          <h1>All Blogs</h1>
          <p>
            Explore all stories, educational insights, and creative perspectives from Academic Arc.
          </p>
        </header>

        {!loading && !error && blogs.length > 0 && (
          <div className="all-blogs-controls">
            <div className="all-blogs-filters" role="tablist" aria-label="Blog categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`all-blogs-filter-btn ${
                    selectedCategory === cat ? 'active' : ''
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="all-blogs-search-wrap">
              <input
                type="text"
                className="all-blogs-search-input"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search blogs"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="all-blogs-state-box">Loading blogs...</div>
        ) : error ? (
          <div className="all-blogs-state-box all-blogs-error">{error}</div>
        ) : filteredBlogs.length === 0 ? (
          <div className="all-blogs-state-box">
            No blogs found matching your filter.
          </div>
        ) : (
          <div className="all-blogs-grid">
            {filteredBlogs.map((blog) => (
              <article
                key={blog.id}
                className="all-blogs-card"
                onClick={() => navigate(`/blog/${blog.slug || blog.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && navigate(`/blog/${blog.slug || blog.id}`)
                }
              >
                <div className="all-blogs-card-media">
                  {blog.is_cover_story && (
                    <span className="all-blogs-cover-badge">COVER STORY</span>
                  )}
                  {blog.cover_image_url ? (
                    <img
                      src={blog.cover_image_url}
                      alt={blog.title}
                      className="all-blogs-card-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="all-blogs-card-placeholder">
                      Academic Arc Editorial
                    </div>
                  )}
                </div>

                <div className="all-blogs-card-body">
                  <div className="all-blogs-card-meta">
                    <span className="all-blogs-card-cat">{blog.category}</span>
                    <span className="all-blogs-card-date">
                      {blog.published_date}
                    </span>
                  </div>

                  <h2 className="all-blogs-card-title">{blog.title}</h2>

                  {blog.excerpt && (
                    <p className="all-blogs-card-excerpt">{blog.excerpt}</p>
                  )}

                  <div className="all-blogs-card-footer">
                    <Link
                      to={`/blog/${blog.slug || blog.id}`}
                      className="all-blogs-read-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Read Full Story</span>
                      <span className="all-blogs-arrow">→</span>
                    </Link>
                    {blog.read_time && (
                      <span className="all-blogs-read-time">{blog.read_time}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default AllBlogs
