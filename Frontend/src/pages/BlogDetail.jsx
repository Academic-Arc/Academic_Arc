import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import Navbar from '../components/Navbar'
import './BlogDetail.css'

function BlogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    let isMounted = true
    setLoading(true)
    setError(null)

    fetch(`${API_URL}/blogs/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Article not found.')
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setBlog(data)
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
  }, [id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsappShare = () => {
    const text = encodeURIComponent(`${blog?.title || ''} - Academic Arc\n${window.location.href}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="blog-detail-page">
      <Navbar theme="light" showLanguage={false} />

      <main className="blog-detail-container">
        {/* Navigation back */}
        <div className="blog-detail-nav">
          <button
            type="button"
            className="blog-back-btn"
            onClick={() => navigate('/')}
          >
            ← Back to Showcase
          </button>

          {blog?.issue_label && (
            <span className="blog-detail-issue-badge">
              {blog.issue_label}
            </span>
          )}
        </div>

        {loading ? (
          <div className="blog-detail-loading">
            <div className="blog-spinner"></div>
            <p>Loading article...</p>
          </div>
        ) : error ? (
          <div className="blog-detail-error">
            <h2>Article Not Found</h2>
            <p>{error}</p>
            <Link to="/" className="blog-return-home-btn">
              Return to Homepage
            </Link>
          </div>
        ) : blog ? (
          <article className="blog-article-card">
            {/* Header info */}
            <header className="blog-article-header">
              <div className="blog-article-tags">
                <span className="blog-article-category">
                  {blog.category}
                </span>
                {blog.is_cover_story && (
                  <span className="blog-article-cover-tag">
                    COVER STORY
                  </span>
                )}
              </div>

              <h1 className="blog-article-title">
                {blog.title}
              </h1>

              <div className="blog-article-meta-row">
                <div className="blog-article-meta-left">
                  <span>📅 {blog.published_date}</span>
                  {blog.read_time && <span>⏱️ {blog.read_time}</span>}
                  <span>👁️ {blog.view_count || 1} views</span>
                </div>

                <div className="blog-article-share-actions">
                  <button
                    type="button"
                    className="blog-share-pill"
                    onClick={handleShare}
                    title="Copy Link"
                  >
                    {copied ? '✓ Link Copied' : '🔗 Copy Link'}
                  </button>

                  <button
                    type="button"
                    className="blog-share-pill whatsapp"
                    onClick={handleWhatsappShare}
                    title="Share on WhatsApp"
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            </header>

            {/* Main Cover Image */}
            {blog.cover_image_url && (
              <div className="blog-article-main-image-wrapper">
                <img
                  src={blog.cover_image_url}
                  alt={blog.title}
                  className="blog-article-main-image"
                />
              </div>
            )}

            {/* Excerpt highlight */}
            {blog.excerpt && (
              <div className="blog-article-excerpt-highlight">
                <p>{blog.excerpt}</p>
              </div>
            )}

            {/* Body Content */}
            <div className="blog-article-body">
              {blog.content ? (
                blog.content.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p>{blog.excerpt}</p>
              )}
            </div>

            {/* Author Footer */}
            <footer className="blog-article-footer">
              <div className="blog-article-author-info">
                <strong>Editorial:</strong> {blog.author_name || 'Academic Arc Editorial'}
              </div>
            </footer>

            {/* Related Articles */}
            {blog.related && blog.related.length > 0 && (
              <section className="blog-related-section">
                <h3>More Stories</h3>
                <div className="blog-related-grid">
                  {blog.related.map((rel) => (
                    <div
                      key={rel.id}
                      className="blog-related-card"
                      onClick={() => navigate(`/blog/${rel.slug || rel.id}`)}
                    >
                      {rel.cover_image_url && (
                        <img
                          src={rel.cover_image_url}
                          alt={rel.title}
                          className="blog-related-thumb"
                        />
                      )}
                      <div>
                        <span className="blog-related-cat">{rel.category}</span>
                        <h4>{rel.title}</h4>
                        <span className="blog-related-date">{rel.published_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
        ) : null}
      </main>
    </div>
  )
}

export default BlogDetail
