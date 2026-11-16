import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const categories = [
  { name: 'All', label: 'All Works', icon: '/Icons/all.svg' },
  { name: 'Writing', label: 'Writing', icon: '/Icons/writing.svg' },
  { name: 'Drawing', label: 'Drawing', icon: '/Icons/drawing.svg' },
  { name: 'Poem', label: 'Poetry', icon: '/Icons/poem.svg' },
  { name: 'Song', label: 'Song', icon: '/Icons/song.svg' },
  { name: 'Instrumental', label: 'Instrumental', icon: '/Icons/instrument.svg' },
  { name: 'Dance', label: 'Dance', icon: '/Icons/dance.svg' },
]

const descriptions = {
  All:
    'Explore student sketches, stories, poetry, music and performances across Academic Arc.',
  Writing:
    'Explore original stories, essays and creative writing by students on Academic Arc.',
  Drawing:
    'Explore student sketches, paintings and illustrations on Academic Arc.',
  Poem:
    'Explore original poetry and compositions created by students on Academic Arc.',
  Song:
    'Discover original songs and musical creations by students on Academic Arc.',
  Instrumental:
    'Discover instrumental performances created and shared by students on Academic Arc.',
  Dance:
    'Explore classical, contemporary and folk dance performances by students on Academic Arc.',
}

function CategorySidebar({ categoryName }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  const isHomeActive = location.pathname === '/'
  const isAllActive = categoryName?.toLowerCase() === 'all'

  const isMoreActive =
    categoryName === 'Poem' ||
    categoryName === 'Song' ||
    categoryName === 'Instrumental' ||
    categoryName === 'Dance' ||
    moreOpen

  const primaryCategories = [
    { name: 'All', label: 'All', path: '/category/All', icon: '/Icons/all.svg' },
    { name: 'Writing', label: 'Writing', path: '/category/Writing', icon: '/Icons/writing.svg' },
    { name: 'Drawing', label: 'Drawing', path: '/category/Drawing', icon: '/Icons/drawing.svg' },
  ]

  const moreCategories = [
    { name: 'Poem', label: 'Poetry', path: '/category/Poem', icon: '/Icons/poem.svg' },
    { name: 'Song', label: 'Song', path: '/category/Song', icon: '/Icons/song.svg' },
    { name: 'Instrumental', label: 'Instrumental', path: '/category/Instrumental', icon: '/Icons/instrument.svg' },
    { name: 'Dance', label: 'Dance', path: '/category/Dance', icon: '/Icons/dance.svg' },
  ]

  return (
    <>
      {/* ========================================================= */}
      {/* DESKTOP & TABLET SIDEBAR (Retained as-is, hidden on mobile) */}
      {/* ========================================================= */}
      <aside className="category-sidebar" aria-label="Category navigation">
        <div className="category-sidebar-content">
          {/* Back to Home Button */}
          <Link
            to="/"
            className="category-sidebar-back"
            aria-label="Back to home"
            title="Back to home"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          {/* Current Category Hero Section */}
          <div className="category-sidebar-hero">
            <span className="category-sidebar-label">CATEGORY</span>
            <h2 className="category-sidebar-title">
              {categoryName?.toLowerCase() === 'all'
                ? 'All Works'
                : categoryName === 'Poem'
                ? 'Poetry'
                : categoryName}
            </h2>
            <p className="category-sidebar-desc">
              {descriptions[categoryName] ||
                descriptions[categoryName === 'All' ? 'All' : ''] ||
                'Explore student creations on Academic Arc.'}
            </p>
          </div>

          {/* Explore Other Categories */}
          <div className="category-sidebar-nav-section">
            <span className="category-sidebar-nav-heading">EXPLORE</span>
            <nav className="category-sidebar-nav">
              {categories.map((category) => {
                const isActive =
                  categoryName?.toLowerCase() === category.name.toLowerCase()
                return (
                  <Link
                    key={category.name}
                    to={`/category/${encodeURIComponent(category.name)}`}
                    className={`category-sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="category-link-icon-wrap">
                      <img
                        src={category.icon}
                        alt=""
                        className="category-link-icon"
                      />
                    </span>
                    <span className="category-link-label">{category.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Submit Work Button */}
          <Link to="/submit" className="category-sidebar-submit">
            <img src="/Icons/submit.svg" alt="" className="category-submit-icon" />
            <span>Submit</span>
          </Link>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR                        */}
      {/* ========================================================= */}
      <nav className="mobile-bottom-nav" aria-label="Category navigation">
        {/* Home Button */}
        <Link
          to="/"
          className={`mobile-bottom-nav-item ${isHomeActive ? 'active' : ''}`}
          onClick={() => setMoreOpen(false)}
        >
          <img src="/Icons/home.svg" alt="Home" />
          <span>Home</span>
        </Link>

        {/* All, Writing, Drawing */}
        {primaryCategories.map((item) => {
          const isActive = categoryName?.toLowerCase() === item.name.toLowerCase()

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMoreOpen(false)}
            >
              <img src={item.icon} alt={item.label} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* More Button (opens Song, Instrumental, Dance & Submit) */}
        <button
          type="button"
          className={`mobile-bottom-nav-item ${isMoreActive ? 'active' : ''}`}
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-label={moreOpen ? 'Close more menu' : 'Open more categories menu'}
          aria-expanded={moreOpen}
        >
          <img src="/Icons/more.svg" alt="More" />
          <span>More</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MOBILE "MORE" COMPACT MENU SHEET                          */}
      {/* ========================================================= */}
      {moreOpen && (
        <>
          <div
            className="mobile-more-backdrop"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          <div
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More categories menu"
          >
            <div className="mobile-more-header">
              <div className="mobile-more-heading-group">
                <span className="mobile-more-category-tag">CATEGORY</span>
                <h2 className="mobile-more-title">
                  {categoryName?.toLowerCase() === 'all'
                    ? 'All Works'
                    : categoryName === 'Poem'
                    ? 'Poetry'
                    : categoryName}
                </h2>
                <p className="mobile-more-desc">
                  {descriptions[categoryName] ||
                    descriptions[categoryName === 'All' ? 'All' : ''] ||
                    'Explore student creations on Academic Arc.'}
                </p>
              </div>

              <button
                type="button"
                className="mobile-more-close"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="mobile-more-explore-group">
              <span className="mobile-more-explore-tag">EXPLORE</span>
              <div className="mobile-more-links">
                {moreCategories.map((item) => {
                  const isActive =
                    categoryName?.toLowerCase() === item.name.toLowerCase()

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`mobile-more-link ${isActive ? 'active' : ''}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <img src={item.icon} alt={item.label} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            <Link
              to="/submit"
              className="mobile-more-submit"
              onClick={() => setMoreOpen(false)}
            >
              Submit
            </Link>
          </div>
        </>
      )}
    </>
  )
}

export default CategorySidebar