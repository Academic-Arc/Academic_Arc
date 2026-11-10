import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import './BlogSection.css'

function BlogSection() {
  const navigate = useNavigate()
  const [blogData, setBlogData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchBlogs = async () => {
      try {
        const response = await fetch(`${API_URL}/blogs/`)
        if (!response.ok) {
          throw new Error('Failed to load blog section')
        }
        const data = await response.json()
        if (isMounted) {
          setBlogData({
            issue_label: data.issue_label || '',
            cover_story: data.cover_story || null,
            articles: data.articles || []
          })
        }
      } catch (err) {
        console.error('Error fetching blogs:', err)
        if (isMounted) {
          setBlogData({
            issue_label: '',
            cover_story: null,
            articles: []
          })
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchBlogs()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return null
  }

  const cover = blogData?.cover_story
  const sidebarArticles = blogData?.articles || []
  const hasBlogs = !!cover || sidebarArticles.length > 0

  const handleArticleClick = (article) => {
    const target = article.slug || article.id
    navigate(`/blog/${target}`)
  }

  return (
    <section className="blog-editorial-section" aria-label="Editorial Magazine Section">
      {/* SECTION HEADER */}
      <div className="blog-section-header">
        <div className="section-label">
          • EDITORIAL
        </div>
        <h2>Blogs</h2>
        <p>
          Discover stories, educational insights, and creative perspectives.
        </p>
      </div>

      {!hasBlogs ? (
        <div className="blog-empty-state">
          <p>No blogs available at the moment.</p>
        </div>
      ) : (
        /* Main Grid: Cover Story + Sidebar Articles */
        <div className="blog-editorial-grid">
          {/* LEFT COLUMN: Main Cover Story */}
          {cover && (
            <article className="blog-cover-column">
              {/* Date-Issue line only stretching across the cover story */}
              <div className="blog-issue-divider">
                <div className="blog-issue-line left"></div>
                <div className="blog-issue-badge">
                  {blogData?.issue_label || "JUNE 2026 • ISSUE 14"}
                </div>
                <div className="blog-issue-line right"></div>
              </div>

              <div
                className="blog-cover-image-container"
                onClick={() => handleArticleClick(cover)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleArticleClick(cover)}
              >
                <span className="blog-cover-badge">
                  COVER STORY
                </span>
                {cover.cover_image_url ? (
                  <img
                    src={cover.cover_image_url}
                    alt={cover.title}
                    className="blog-cover-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="blog-cover-image-placeholder">
                    Academic Arc Editorial
                  </div>
                )}
              </div>

              <div className="blog-cover-meta-row">
                <span className="blog-meta-item blog-meta-category">
                  <svg
                    className="blog-meta-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {cover.category}
                </span>

                <span className="blog-meta-item blog-meta-date">
                  <svg
                    className="blog-meta-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {cover.published_date}
                </span>
              </div>

              <h2
                className="blog-cover-heading"
                onClick={() => handleArticleClick(cover)}
              >
                {cover.title}
              </h2>

              <p className="blog-cover-summary">
                {cover.excerpt}
              </p>

              <Link
                to={`/blog/${cover.slug || cover.id}`}
                className="blog-cover-cta-link"
              >
                <span>Read Full Story</span>
                <span className="blog-cta-arrow">→</span>
              </Link>
            </article>
          )}

          {/* RIGHT COLUMN: Sidebar Articles */}
          {sidebarArticles.length > 0 && (
            <aside className="blog-sidebar-column">
              <div className="blog-sidebar-header">
                <h3>Read More</h3>
                <div className="blog-sidebar-divider"></div>
              </div>

              <div className="blog-sidebar-cards">
                {sidebarArticles.map((article) => (
                  <div
                    key={article.id}
                    className="blog-sidebar-item"
                    onClick={() => handleArticleClick(article)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleArticleClick(article)}
                  >
                    {article.cover_image_url && (
                      <div className="blog-sidebar-thumb-wrap">
                        <img
                          src={article.cover_image_url}
                          alt={article.title}
                          className="blog-sidebar-thumb-img"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="blog-sidebar-body">
                      <span className="blog-sidebar-cat">
                        {article.category}
                      </span>

                      <h4 className="blog-sidebar-headline">
                        {article.title}
                      </h4>

                      <span className="blog-sidebar-timestamp">
                        {article.published_date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      )}
    </section>
  )
}

export default BlogSection
