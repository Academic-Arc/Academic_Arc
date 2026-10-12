import { Link } from 'react-router-dom'

const categories = [
  { name: 'Writing', label: 'Writing' },
  { name: 'Drawing', label: 'Drawing' },
  { name: 'Poem', label: 'Poetry' },
  { name: 'Song', label: 'Song' },
  { name: 'Instrumental', label: 'Instrumental' },
  { name: 'Dance', label: 'Dance' },
]

const descriptions = {
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
  return (
    <aside className="category-sidebar">
      <Link to="/" className="category-sidebar-back" aria-label="Back to home">
        <img src="/Icons/dropdown.svg" alt="Back"/>
      </Link>

      <div className="category-sidebar-section">
        <span className="category-sidebar-label">CATEGORY</span>

        <h2>
          {categoryName === 'Poem' ? 'Poetry' : categoryName}
        </h2>

        <p>
          {descriptions[categoryName] ||
            'Explore student creations on Academic Arc.'}
        </p>
      </div>

      <div className="category-sidebar-section">
        <span className="category-sidebar-label">EXPLORE</span>

        <nav className="category-sidebar-nav">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/category/${encodeURIComponent(category.name)}`}
              className={
                category.name === categoryName
                  ? 'category-sidebar-link active'
                  : 'category-sidebar-link'
              }
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </div>

      <Link to="/submit" className="category-sidebar-submit">
        Submit
      </Link>
    </aside>
  )
}

export default CategorySidebar