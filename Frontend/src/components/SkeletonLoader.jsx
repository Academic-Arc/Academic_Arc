
import './SkeletonLoader.css'

function SkeletonLoader() {
  return (
    <div className="skeleton-dashboard">
      {/* Navbar */}
      <div className="skeleton-navbar">
        <div className="skeleton-logo skeleton-shimmer" />
        <div className="skeleton-nav-links">
          <div className="skeleton-line skeleton-shimmer" />
          <div className="skeleton-line skeleton-shimmer" />
          <div className="skeleton-circle skeleton-shimmer" />
        </div>
      </div>

      {/* Dashboard heading */}
      <main className="skeleton-main">
        <div className="skeleton-label skeleton-shimmer" />
        <div className="skeleton-heading skeleton-shimmer" />
        <div className="skeleton-description skeleton-shimmer" />

        {/* Category cards */}
        <div className="skeleton-categories">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-category skeleton-shimmer"
            >
              <div className="skeleton-category-content">
                <div className="skeleton-line skeleton-shimmer" />
                <div className="skeleton-category-title skeleton-shimmer" />
                <div className="skeleton-line skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Featured section */}
        <div className="skeleton-featured">
          <div className="skeleton-section-title skeleton-shimmer" />
          <div className="skeleton-section-description skeleton-shimmer" />

          <div className="skeleton-featured-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton-featured-card">
                <div className="skeleton-featured-image skeleton-shimmer" />
                <div className="skeleton-featured-content">
                  <div className="skeleton-line skeleton-shimmer" />
                  <div className="skeleton-card-title skeleton-shimmer" />
                  <div className="skeleton-line skeleton-shimmer" />
                  <div className="skeleton-author">
                    <div className="skeleton-circle skeleton-shimmer" />
                    <div className="skeleton-author-text skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default SkeletonLoader
