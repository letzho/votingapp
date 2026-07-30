import { Link } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <img src="/logo.png" alt="NYP Logo" className="logo" />
            <div>
              <p className="event-label">Engineering Exploration Project</p>
              <h1 className="event-title">Event</h1>
            </div>
          </Link>
          {showNav && (
            <nav className="header-nav">
              <Link to="/">Vote</Link>
            </nav>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <p>NYP Engineering Exploration Project Voting</p>
      </footer>
    </div>
  )
}
