import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminSidebar.css'

function AdminSidebar({ admin, activePage, onLogout }) {
    const navigate = useNavigate()
    const [expanded, setExpanded] = useState(false)

    const handleNavigation = (path) => {
        navigate(path)
    }

    return (
        <>
            <div className="admin-sidebar-backdrop"></div>

            <aside className={`admin-sidebar ${expanded ? 'expanded' : ''}`}>

                <div className="admin-brand">

                    <div className="admin-brand-content">
                        <h2>Academic Arc</h2>
                        <span>ADMIN PANEL</span>
                    </div>

                    <button
                        className="admin-sidebar-toggle"
                        aria-label="Toggle sidebar"
                        onClick={() => setExpanded((prev) => !prev)}
                    >
                        <span className="admin-sidebar-toggle-open">
                            <img src="/Icons/hamburger-menu.svg" alt="Hamburger Menu"/>
                        </span>
                        <span className="admin-sidebar-toggle-close">
                            <img src="/Icons/back.svg" alt="Back"/>
                        </span>
                    </button>

                </div>


                <nav className="admin-nav">

                    <button
                        className={`admin-nav-item ${
                            activePage === 'dashboard' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin')}
                    >
                        <span>▦</span>
                        <strong>Dashboard</strong>
                    </button>


                    <div className="admin-nav-section">
                        CONTENT
                    </div>

                    <button
                        className={`admin-nav-item ${
                            activePage === 'posts' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin/posts')}
                    >
                        <span>◫</span>
                        <strong>Posts</strong>
                    </button>

                    <button
                        className={`admin-nav-item ${
                            activePage === 'categories' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin/categories')}
                    >
                        <span>◈</span>
                        <strong>Categories</strong>
                    </button>

                    <button
                        className={`admin-nav-item ${
                            activePage === 'featured' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin/featured')}
                    >
                        <span>★</span>
                        <strong>Featured</strong>
                    </button>


                    <div className="admin-nav-section">
                        USERS
                    </div>

                    <button
                        className={`admin-nav-item ${
                            activePage === 'users' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin/users')}
                    >
                        <span>♙</span>
                        <strong>Users</strong>
                    </button>

                    <button
                        className={`admin-nav-item ${
                            activePage === 'reports' ? 'active' : ''
                        }`}
                        onClick={() => handleNavigation('/admin/reports')}
                    >
                        <span>⚑</span>
                        <strong>Reports</strong>
                    </button>

                    <button className="admin-nav-item">
                        <span>♟</span>
                        <strong>Admins</strong>
                    </button>


                    <div className="admin-nav-section">
                        SYSTEM
                    </div>

                    <button className="admin-nav-item">
                        <span>⚙</span>
                        <strong>Settings</strong>
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
                        onClick={onLogout}
                    >
                        ← Logout
                    </button>

                </div>

            </aside>
        </>
    )
}

export default AdminSidebar