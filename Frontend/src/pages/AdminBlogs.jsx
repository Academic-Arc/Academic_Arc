import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import AdminSidebar from '../components/AdminSidebar'
import { usePrompt } from '../context/PromptContext'
import './AdminBlogs.css'

function AdminBlogs() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = usePrompt()

  const [admin, setAdmin] = useState(null)
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'Science & Technology',
    cover_image_url: '',
    issue_label: 'JUNE 2026 • ISSUE 14',
    published_date: '',
    read_time: '5 min read',
    author_name: 'Academic Arc Editorial',
    is_cover_story: false,
    is_published: true,
    excerpt: '',
    content: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const token = localStorage.getItem('access_token')

  const verifyAdminAndLoad = async () => {
    if (!token) {
      navigate('/login')
      return
    }

    try {
      const adminRes = await fetch(`${API_URL}/admin/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!adminRes.ok) {
        localStorage.removeItem('access_token')
        navigate('/login')
        return
      }

      const adminData = await adminRes.json()
      setAdmin(adminData)

      // Fetch all blogs
      const blogsRes = await fetch(`${API_URL}/blogs/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (blogsRes.ok) {
        const blogsData = await blogsRes.json()
        setBlogs(blogsData)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load editorial blogs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verifyAdminAndLoad()
  }, [])

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isModalOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  const handleOpenCreate = () => {
    setEditingBlog(null)
    setFormData({
      title: '',
      slug: '',
      category: 'Science & Technology',
      cover_image_url: '',
      issue_label: 'JUNE 2026 • ISSUE 14',
      published_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      read_time: '5 min read',
      author_name: admin?.name || 'Academic Arc Editorial',
      is_cover_story: false,
      is_published: true,
      excerpt: '',
      content: ''
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (blog) => {
    setEditingBlog(blog)
    setFormData({
      title: blog.title || '',
      slug: blog.slug || '',
      category: blog.category || 'Science & Technology',
      cover_image_url: blog.cover_image_url || '',
      issue_label: blog.issue_label || 'JUNE 2026 • ISSUE 14',
      published_date: blog.published_date || '',
      read_time: blog.read_time || '5 min read',
      author_name: blog.author_name || 'Academic Arc Editorial',
      is_cover_story: !!blog.is_cover_story,
      is_published: !!blog.is_published,
      excerpt: blog.excerpt || '',
      content: blog.content || ''
    })
    setIsModalOpen(true)
  }

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError(null)

    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/blogs/admin/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: uploadFormData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to upload image')
      }

      const data = await res.json()
      setFormData((prev) => ({
        ...prev,
        cover_image_url: data.url
      }))
      setSuccessMsg('Cover image uploaded successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const url = editingBlog
        ? `${API_URL}/blogs/admin/${editingBlog.id}`
        : `${API_URL}/blogs/admin/`

      const method = editingBlog ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to save blog post')
      }

      setSuccessMsg(editingBlog ? 'Article updated successfully!' : 'Article uploaded and published successfully!')
      setIsModalOpen(false)
      verifyAdminAndLoad()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (blogId) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this editorial article?'
    )
    if (!confirmed) return

    try {
      const res = await fetch(`${API_URL}/blogs/admin/${blogId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to delete blog post')
      }

      setSuccessMsg('Blog post deleted successfully')
      verifyAdminAndLoad()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleToggleCoverStory = async (blog) => {
    try {
      const res = await fetch(`${API_URL}/blogs/admin/${blog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_cover_story: !blog.is_cover_story })
      })

      if (res.ok) {
        verifyAdminAndLoad()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        Loading editorial blogs...
      </div>
    )
  }

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <AdminSidebar
        admin={admin}
        activePage="blogs"
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">CONTENT MANAGEMENT</p>
            <h1>Editorial Blogs</h1>
            <p className="admin-welcome">
              Manage magazine editorial articles, cover stories, and publication issues.
            </p>
          </div>

          <div className="admin-header-profile">
            <div className="admin-header-avatar">
              {admin?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <strong>{admin?.name}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        {successMsg && <div className="admin-blogs-alert success">{successMsg}</div>}
        {error && <div className="admin-blogs-alert error">{error}</div>}

        {/* ARTICLES SECTION */}
        <section className="admin-featured-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">ADMIN ARTICLES</p>
              <h2>Published Articles</h2>
              <p>Articles currently stored in the database.</p>
            </div>

            <div className="admin-featured-heading-actions">
              <span className="admin-featured-count">{blogs.length} articles</span>
              <button
                type="button"
                className="admin-featured-add"
                onClick={handleOpenCreate}
              >
                + Upload New Article
              </button>
            </div>
          </div>

          <div className="admin-featured-list">
            {blogs.length === 0 ? (
              <p className="admin-no-posts">
                No blogs in the database yet. Click "+ Upload New Article" to publish your first blog.
              </p>
            ) : (
              blogs.map((b) => (
                <div
                  key={b.id}
                  className={`admin-featured-card admin-blog-card ${b.is_cover_story ? 'is-cover-story' : ''}`}
                >
                  {b.cover_image_url && (
                    <div className="admin-blog-thumb">
                      <img src={b.cover_image_url} alt="" />
                    </div>
                  )}

                  <div className="admin-featured-card-content">
                    <div className="admin-featured-card-top">
                      <span className="admin-category-badge">{b.category}</span>
                      {b.is_cover_story && (
                        <span className="admin-special-label">Cover Story</span>
                      )}
                      {b.issue_label && (
                        <span className="admin-category-badge">{b.issue_label}</span>
                      )}
                    </div>

                    <h3>{b.title}</h3>
                    <p>{b.excerpt}</p>

                    <div className="admin-featured-meta">
                      <span>📅 {b.published_date}</span>
                      <span>⏱️ {b.read_time}</span>
                      <span>👁️ {b.view_count} views</span>
                      <span>By: {b.author_name}</span>
                    </div>
                  </div>

                  <div className="admin-blog-actions">
                    <button
                      type="button"
                      className={`admin-action-btn-light ${b.is_cover_story ? 'cover-active' : ''}`}
                      onClick={() => handleToggleCoverStory(b)}
                    >
                      {b.is_cover_story ? '★ Cover Story' : 'Set as Cover'}
                    </button>

                    <button
                      type="button"
                      className="admin-action-btn-light"
                      onClick={() => handleOpenEdit(b)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="admin-featured-remove"
                      onClick={() => handleDelete(b.id)}
                    >
                      Delete
                    </button>

                    <a
                      href={`/blog/${b.slug || b.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-action-btn-light"
                    >
                      Preview ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* MODAL POPUP - LIGHT THEME (With independent scroll & fixed header/footer) */}
        {isModalOpen && (
          <div className="admin-blog-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="admin-blog-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-blog-modal-header">
                <div>
                  <h3>{editingBlog ? 'Edit Editorial Blog' : 'Upload New Blog Article'}</h3>
                  <p className="admin-blog-modal-subtitle">
                    Fill in the details below to publish to the magazine showcase.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-blog-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  title="Close modal"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-blog-modal-form">
                <div className="admin-blog-modal-body">
                  <div className="admin-form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. How Bengal's Students Are Preparing in the Age of Artificial Intelligence"
                    />
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Category *</label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g. Science & Technology, History, Society, Environment"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Issue Label</label>
                      <input
                        type="text"
                        value={formData.issue_label}
                        onChange={(e) => setFormData({ ...formData, issue_label: e.target.value })}
                        placeholder="e.g. JUNE 2026 • ISSUE 14"
                      />
                    </div>
                  </div>

                  {/* COVER IMAGE UPLOAD + URL */}
                  <div className="admin-form-group">
                    <label>Cover Image (Upload File or Enter URL)</label>
                    <div className="admin-file-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        id="blog-image-input"
                        onChange={handleImageFileUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <span className="admin-uploading-tag">Uploading image...</span>
                      )}
                    </div>

                    <input
                      type="url"
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                      placeholder="Or paste image URL (https://...)"
                      style={{ marginTop: '6px' }}
                    />

                    {formData.cover_image_url && (
                      <div className="admin-image-preview-bar">
                        <img src={formData.cover_image_url} alt="Cover Preview" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                          className="admin-remove-image-btn"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Published Date Display</label>
                      <input
                        type="text"
                        value={formData.published_date}
                        onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                        placeholder="e.g. June 5, 2026"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Read Time</label>
                      <input
                        type="text"
                        value={formData.read_time}
                        onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                        placeholder="e.g. 5 min read"
                      />
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Slug (URL Identifier - optional)</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. ai-in-bengal-education"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Author / Editorial Credit</label>
                      <input
                        type="text"
                        value={formData.author_name}
                        onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                        placeholder="e.g. Academic Arc Editorial"
                      />
                    </div>
                  </div>

                  <div className="admin-form-checkboxes">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_cover_story}
                        onChange={(e) => setFormData({ ...formData, is_cover_story: e.target.checked })}
                      />
                      Mark as Cover Story (Shown prominently in left feature column)
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      />
                      Publish immediately (visible on public showcase)
                    </label>
                  </div>

                  <div className="admin-form-group">
                    <label>Excerpt / Summary *</label>
                    <textarea
                      rows={3}
                      required
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Short summary displayed on cards..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Full Content (Paragraphs separated by blank lines) *</label>
                    <textarea
                      rows={7}
                      required
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Full article content in English..."
                    />
                  </div>
                </div>

                <div className="admin-blog-modal-footer">
                  <button
                    type="button"
                    className="admin-blog-modal-cancel-btn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="admin-blog-modal-submit-btn"
                  >
                    {submitting ? 'Saving...' : editingBlog ? 'Update Article' : 'Publish Article'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminBlogs
