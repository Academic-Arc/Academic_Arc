import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './AdminCategories.css'

function AdminCategories() {
    const navigate = useNavigate()

    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            const token = localStorage.getItem('access_token')

            if (!token) {
                navigate('/login')
                return
            }

            try {
                const response = await fetch(
                    `${API_URL}/admin/categories`,
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
                setCategories(data)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchCategories()
    }, [navigate])

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

                    <button className="admin-nav-item active">
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

                        <h1>Categories</h1>

                        <p className="admin-welcome">
                            Overview of your published content categories.
                        </p>
                    </div>

                    <div className="admin-post-count">
                        {categories.length} categories
                    </div>

                </header>


                <section className="admin-categories-panel">

                    {loading ? (

                        <div className="admin-categories-loading">
                            Loading categories...
                        </div>

                    ) : categories.length === 0 ? (

                        <div className="admin-categories-empty">

                            <div className="admin-empty-icon">
                                ◈
                            </div>

                            <h3>No categories yet</h3>

                            <p>
                                Categories will appear here when posts are published.
                            </p>

                        </div>

                    ) : (

                        <div className="admin-category-list">

                            {categories.map((category) => (

                                <div
                                    key={category.name}
                                    className="admin-category-row"
                                >

                                    <div className="admin-category-info">

                                        <div className="admin-category-icon">
                                            ◈
                                        </div>

                                        <div>
                                            <strong>
                                                {category.name}
                                            </strong>

                                            <span>
                                                {category.post_count === 1
                                                    ? '1 published post'
                                                    : `${category.post_count} published posts`}
                                            </span>
                                        </div>

                                    </div>


                                    <button
                                        className="admin-category-view"
                                        onClick={() =>
                                            navigate('/admin/posts')
                                        }
                                    >
                                        View Posts
                                        <span>→</span>
                                    </button>

                                </div>

                            ))}

                        </div>

                    )}

                </section>

            </main>

        </div>
    )
}

export default AdminCategories