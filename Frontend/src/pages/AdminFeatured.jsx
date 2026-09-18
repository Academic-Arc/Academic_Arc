import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminFeatured.css'

function AdminFeatured() {
    const navigate = useNavigate()

    const [admin, setAdmin] = useState(null)
    const [featuredPosts, setFeaturedPosts] = useState([])
    const [allPosts, setAllPosts] = useState([])
    const [showAddPosts, setShowAddPosts] = useState(false)
    const [search, setSearch] = useState('')
    const [addingPost, setAddingPost] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadFeatured = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const adminResponse = await fetch(
                    `${API_URL}/admin/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!adminResponse.ok) {
                    localStorage.removeItem('access_token')
                    navigate('/login')
                    return
                }

                const adminData = await adminResponse.json()
                setAdmin(adminData)

                const featuredResponse = await fetch(
                    `${API_URL}/admin/featured`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!featuredResponse.ok) {
                    throw new Error('Failed to load featured posts')
                }

                const featuredData = await featuredResponse.json()
                setFeaturedPosts(featuredData)

                const postsResponse = await fetch(
                    `${API_URL}/admin/posts`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!postsResponse.ok) {
                    throw new Error('Failed to load posts')
                }

                const postsData = await postsResponse.json()
                setAllPosts(postsData)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        loadFeatured()
    }, [navigate])

    const addFeature = async (submissionId) => {
        const token = localStorage.getItem('access_token')

        setAddingPost(submissionId)

        try {
            const response = await fetch(
                `${API_URL}/admin/featured/${submissionId}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Failed to add special mention')
                return
            }

            // Reload featured posts
            const featuredResponse = await fetch(
                `${API_URL}/admin/featured`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (featuredResponse.ok) {
                const featuredData = await featuredResponse.json()
                setFeaturedPosts(featuredData)
            }

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        } finally {
            setAddingPost(null)
        }
    }

    const featuredIds = new Set(
        featuredPosts.map((post) => post.submission_id)
    )

    const availablePosts = allPosts
        .filter((post) => !featuredIds.has(post.id))
        .filter((post) => {
            const query = search.toLowerCase()

            return (
                post.heading?.toLowerCase().includes(query) ||
                post.user_name?.toLowerCase().includes(query) ||
                post.content_type?.toLowerCase().includes(query)
            )
        })

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    const removeFeature = async (submissionId) => {
        const token = localStorage.getItem('access_token')

        try {
            const response = await fetch(
                `${API_URL}/admin/featured/${submissionId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                const data = await response.json()
                alert(data.detail || 'Failed to remove special mention')
                return
            }

            setFeaturedPosts((current) =>
                current.filter(
                    (post) => post.submission_id !== submissionId
                )
            )

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    if (loading) {
        return (
            <div className="admin-loading">
                Loading featured posts...
            </div>
        )
    }

    return (
        <div className="admin-layout">

            {/* SIDEBAR */}
            <aside className="admin-sidebar">

                <div className="admin-brand">
                    <h2>Academic Arc</h2>
                    <span>ADMIN PANEL</span>
                </div>

                <nav className="admin-nav">

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin')}
                    >
                        <span>▦</span>
                        Dashboard
                    </button>

                    <div className="admin-nav-section">
                        CONTENT
                    </div>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/posts')}
                    >
                        <span>◫</span>
                        Posts
                    </button>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/categories')}
                    >
                        <span>◈</span>
                        Categories
                    </button>

                    <button className="admin-nav-item active">
                        <span>★</span>
                        Featured
                    </button>

                    <div className="admin-nav-section">
                        USERS
                    </div>

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/users')}
                    >
                        <span>♙</span>
                        Users
                    </button>

                    <button className="admin-nav-item">
                        <span>⚑</span>
                        Reports
                    </button>

                    <button className="admin-nav-item">
                        <span>♟</span>
                        Admins
                    </button>

                    <div className="admin-nav-section">
                        SYSTEM
                    </div>

                    <button className="admin-nav-item">
                        <span>⚙</span>
                        Settings
                    </button>

                </nav>

                <div className="admin-sidebar-bottom">

                    <div className="admin-user">

                        <div className="admin-avatar">
                            {admin?.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="admin-user-info">
                            <strong>{admin?.name}</strong>
                            <span>Administrator</span>
                        </div>

                    </div>

                    <button
                        className="admin-logout"
                        onClick={handleLogout}
                    >
                        ← Logout
                    </button>

                </div>

            </aside>


            {/* MAIN CONTENT */}
            <main className="admin-main">

                <header className="admin-header">

                    <div>
                        <p className="admin-eyebrow">
                            CONTENT MANAGEMENT
                        </p>

                        <h1>Featured</h1>

                        <p className="admin-welcome">
                            Manage featured posts and special mentions.
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


                {/* SPECIAL MENTIONS */}
                <section className="admin-featured-section">

                    <div className="admin-section-heading">

                        <div>
                            <p className="admin-panel-eyebrow">
                                ADMIN SELECTED
                            </p>

                            <h2>Special Mentions</h2>

                            <p>
                                Posts personally selected by the administrator.
                            </p>
                        </div>

                        <div className="admin-featured-heading-actions">

                            <span className="admin-featured-count">
                                {featuredPosts.length} posts
                            </span>

                            <button
                                className="admin-featured-add"
                                onClick={() => setShowAddPosts(!showAddPosts)}
                            >
                                {showAddPosts ? 'Close' : '+ Add Post'}
                            </button>

                        </div>

                    </div>

                    {showAddPosts && (
                        <div className="admin-add-featured">

                            <div className="admin-add-featured-header">

                                <div>
                                    <h3>Add Special Mention</h3>
                                    <p>
                                        Select a published post to feature.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Search posts..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="admin-featured-search"
                                />

                            </div>

                            <div className="admin-add-featured-list">

                                {availablePosts.length === 0 ? (

                                    <p className="admin-no-posts">
                                        No matching posts found.
                                    </p>

                                ) : (

                                    availablePosts.map((post) => (

                                        <div
                                            className="admin-add-featured-row"
                                            key={post.id}
                                        >

                                            <div>

                                                <strong>
                                                    {post.heading}
                                                </strong>

                                                <span>
                                                    {post.user_name}
                                                    {' • '}
                                                    {post.content_type}
                                                </span>

                                            </div>

                                            <button
                                                className="admin-featured-add-button"
                                                onClick={() => addFeature(post.id)}
                                                disabled={addingPost === post.id}
                                            >
                                                {addingPost === post.id
                                                    ? 'Adding...'
                                                    : 'Feature'}
                                            </button>

                                        </div>

                                    ))

                                )}

                            </div>

                        </div>
                    )}


                    {featuredPosts.length === 0 ? (

                        <div className="admin-empty-state">

                            <div className="admin-empty-icon">
                                ★
                            </div>

                            <h3>No special mentions</h3>

                            <p>
                                Posts selected by the admin will appear here.
                            </p>

                        </div>

                    ) : (

                        <div className="admin-featured-list">

                            {featuredPosts.map((post) => (

                                <article
                                    className="admin-featured-card"
                                    key={post.id}
                                >

                                    <div className="admin-featured-card-content">

                                        <div className="admin-featured-card-top">

                                            <span className="admin-category-badge">
                                                {post.content_type}
                                            </span>

                                            <span className="admin-special-label">
                                                Special Mention
                                            </span>

                                        </div>

                                        <h3>
                                            {post.heading}
                                        </h3>

                                        {post.description && (
                                            <p>
                                                {post.description}
                                            </p>
                                        )}

                                        <div className="admin-featured-meta">

                                            <span>
                                                By {post.user_name}
                                            </span>

                                            {post.is_student && post.school && (
                                                <span>
                                                    {post.school}
                                                </span>
                                            )}

                                            <span>
                                                Featured on{' '}
                                                {new Date(
                                                    post.featured_at
                                                ).toLocaleDateString(
                                                    'en-IN',
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    }
                                                )}
                                            </span>

                                        </div>

                                    </div>

                                    <button
                                        className="admin-featured-remove"
                                        onClick={() =>
                                            removeFeature(
                                                post.submission_id
                                            )
                                        }
                                    >
                                        Remove
                                    </button>

                                </article>

                            ))}

                        </div>

                    )}

                </section>

            </main>

        </div>
    )
}

export default AdminFeatured