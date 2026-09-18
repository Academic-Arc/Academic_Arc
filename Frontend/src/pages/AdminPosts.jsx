import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminPosts.css'

function AdminPosts() {
    const navigate = useNavigate()

    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('All')

    useEffect(() => {
        const fetchPosts = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const response = await fetch(
                    `${API_URL}/admin/posts`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!response.ok) {
                    navigate('/login')
                    return
                }

                const data = await response.json()
                setPosts(data)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchPosts()
    }, [navigate])

    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            post.heading.toLowerCase().includes(search.toLowerCase()) ||
            post.user_name.toLowerCase().includes(search.toLowerCase())

        const matchesFilter =
            filter === 'All' ||
            post.content_type === filter

        return matchesSearch && matchesFilter
    })

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    const handleDelete = async (postId) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this post? This action cannot be undone.'
        )

        if (!confirmed) {
            return
        }

        const token = localStorage.getItem('access_token')

        try {
            const response = await fetch(
                `${API_URL}/admin/posts/${postId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Failed to delete post')
                return
            }

            setPosts((currentPosts) =>
                currentPosts.filter(
                    (post) => post.id !== postId
                )
            )

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
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

                    <button className="admin-nav-item active">
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

                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/admin/featured')}
                    >
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

                    <button
                        className="admin-logout"
                        onClick={() => {
                            localStorage.removeItem('access_token')
                            navigate('/login')
                        }}
                    >
                        ← Logout
                    </button>

                </div>

            </aside>


            {/* MAIN */}
            <main className="admin-main">

                <header className="admin-header">

                    <div>
                        <p className="admin-eyebrow">
                            CONTENT MANAGEMENT
                        </p>

                        <h1>Posts</h1>

                        <p className="admin-welcome">
                            Manage all published submissions.
                        </p>
                    </div>

                    <div className="admin-post-count">
                        {posts.length} posts
                    </div>

                </header>


                {/* CONTROLS */}
                <div className="admin-post-controls">

                    <div className="admin-search">
                        <span>⌕</span>

                        <input
                            type="text"
                            placeholder="Search posts or authors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="admin-filter"
                    >
                        <option value="All">All categories</option>
                        <option value="Poem">Poem</option>
                        <option value="Writing">Writing</option>
                        <option value="Drawing">Drawing</option>
                        <option value="Song">Song</option>
                        <option value="Instrumental">Instrumental</option>
                        <option value="Dance">Dance</option>
                    </select>

                </div>


                {/* POSTS TABLE */}
                <section className="admin-posts-panel">

                    {loading ? (

                        <div className="admin-posts-loading">
                            Loading posts...
                        </div>

                    ) : filteredPosts.length === 0 ? (

                        <div className="admin-posts-empty">

                            <div className="admin-empty-icon">
                                ◫
                            </div>

                            <h3>No posts found</h3>

                            <p>
                                Try changing your search or filter.
                            </p>

                        </div>

                    ) : (

                        <div className="admin-posts-table-wrapper">

                            <table className="admin-posts-table">

                                <thead>
                                    <tr>
                                        <th>POST</th>
                                        <th>AUTHOR</th>
                                        <th>CATEGORY</th>
                                        <th>DATE</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredPosts.map((post) => (

                                        <tr key={post.id}>

                                            <td>
                                                <div className="admin-post-title">
                                                    <strong>
                                                        {post.heading}
                                                    </strong>

                                                    <span>
                                                        {post.description}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-author">

                                                    <div className="admin-author-avatar">
                                                        {post.user_name
                                                            ?.charAt(0)
                                                            ?.toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {post.user_name}
                                                        </strong>

                                                        <span>
                                                            {post.is_student
                                                                ? 'Student'
                                                                : 'User'}
                                                        </span>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="admin-category-badge">
                                                    {post.content_type}
                                                </span>
                                            </td>

                                            <td className="admin-date">
                                                {formatDate(post.created_at)}
                                            </td>

                                            <td>
                                                <div className="admin-post-actions">

                                                    <button
                                                        className="admin-post-action"
                                                        onClick={() =>
                                                            navigate(`/admin/posts/${post.id}`)
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        className="admin-post-delete"
                                                        onClick={() =>
                                                            handleDelete(post.id)
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>

            </main>

        </div>
    )
}

export default AdminPosts