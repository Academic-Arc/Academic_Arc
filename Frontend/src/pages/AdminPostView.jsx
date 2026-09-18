import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminPostView.css'

function AdminPostView() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPost = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const response = await fetch(
                    `${API_URL}/admin/posts/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!response.ok) {
                    navigate('/admin/posts')
                    return
                }

                const data = await response.json()
                setPost(data)

            } catch (error) {
                console.error(error)
                navigate('/admin/posts')
            } finally {
                setLoading(false)
            }
        }

        fetchPost()
    }, [id, navigate])


    const isVideoType = () => {
        const type = post?.content_type?.toLowerCase()

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

        if (url.includes('youtu.be/')) {
            const videoId = url
                .split('youtu.be/')[1]
                .split(/[?&]/)[0]

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`
            }
        }

        if (url.includes('facebook.com')) {
            return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
                url
            )}&show_text=false`
        }

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


    if (loading) {
        return (
            <div className="admin-loading">
                Loading post...
            </div>
        )
    }


    if (!post) {
        return null
    }


    const videoType = isVideoType()
    const uploadedVideo = isUploadedVideo(post.media_url)
    const embedUrl = getEmbedUrl(post.media_url)


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
                        className="admin-nav-item active"
                        onClick={() => navigate('/admin/posts')}
                    >
                        <span>◫</span>
                        Posts
                    </button>

                    <button className="admin-nav-item">
                        <span>◈</span>
                        Categories
                    </button>

                    <button className="admin-nav-item">
                        <span>★</span>
                        Featured
                    </button>

                    <div className="admin-nav-section">
                        USERS
                    </div>

                    <button className="admin-nav-item">
                        <span>♙</span>
                        Students
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

                <button
                    className="admin-back-button"
                    onClick={() => navigate('/admin/posts')}
                >
                    ← Back to Posts
                </button>


                <div className="admin-post-view-header">

                    <div>

                        <p className="admin-eyebrow">
                            POST #{post.id}
                        </p>

                        <h1>
                            {post.heading}
                        </h1>

                        <div className="admin-post-view-meta">

                            <span>
                                {post.content_type}
                            </span>

                            <span>•</span>

                            <span>
                                Published on{' '}
                                {new Date(
                                    post.created_at
                                ).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>

                        </div>

                    </div>

                </div>


                <div className="admin-post-view-grid">

                    {/* POST */}

                    <article className="admin-post-content">

                        {/* MEDIA */}

                        {!videoType &&
                            post.media_url && (

                                <div className="admin-post-media">

                                    <img
                                        src={post.media_url}
                                        alt={post.heading}
                                    />

                                </div>

                            )}


                        {videoType &&
                            uploadedVideo && (

                                <div className="admin-post-media">

                                    <video controls>

                                        <source
                                            src={post.media_url}
                                        />

                                        Your browser does not support
                                        video playback.

                                    </video>

                                </div>

                            )}


                        {videoType &&
                            !uploadedVideo &&
                            embedUrl && (

                                <div className="admin-post-media admin-post-video">

                                    <iframe
                                        src={embedUrl}
                                        title={post.heading}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />

                                </div>

                            )}


                        {videoType &&
                            !uploadedVideo &&
                            !embedUrl &&
                            post.media_url && (

                                <div className="admin-external-link">

                                    <a
                                        href={post.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open media ↗
                                    </a>

                                </div>

                            )}


                        <div className="admin-post-text">

                            <h2>
                                {post.heading}
                            </h2>

                            {post.description && (
                                <p className="admin-post-description">
                                    {post.description}
                                </p>
                            )}


                            {post.written_content && (

                                <div className="admin-written-content">

                                    {post.written_content}

                                </div>

                            )}

                        </div>

                    </article>


                    {/* DETAILS */}

                    <aside className="admin-post-details">

                        <div className="admin-detail-card">

                            <p className="admin-detail-label">
                                AUTHOR
                            </p>

                            <div className="admin-detail-author">

                                <div className="admin-detail-avatar">
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
                                            : 'Non-student user'}
                                    </span>
                                </div>

                            </div>

                        </div>


                        <div className="admin-detail-card">

                            <p className="admin-detail-label">
                                USER INFORMATION
                            </p>

                            <div className="admin-detail-list">

                                <div>
                                    <span>Email</span>
                                    <strong>
                                        {post.user_email}
                                    </strong>
                                </div>

                                <div>
                                    <span>User ID</span>
                                    <strong>
                                        #{post.user_id}
                                    </strong>
                                </div>

                                {post.is_student && (
                                    <>
                                        <div>
                                            <span>School</span>
                                            <strong>
                                                {post.school || '—'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Class</span>
                                            <strong>
                                                {post.student_class || '—'}
                                            </strong>
                                        </div>
                                    </>
                                )}

                            </div>

                        </div>


                        <div className="admin-detail-card">

                            <p className="admin-detail-label">
                                POST INFORMATION
                            </p>

                            <div className="admin-detail-list">

                                <div>
                                    <span>Category</span>
                                    <strong>
                                        {post.content_type}
                                    </strong>
                                </div>

                                <div>
                                    <span>Post ID</span>
                                    <strong>
                                        #{post.id}
                                    </strong>
                                </div>

                            </div>

                        </div>

                    </aside>

                </div>

            </main>

        </div>
    )
}

export default AdminPostView