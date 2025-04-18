import { Link } from '@tanstack/react-router'

const Header = () => {
  return (
    <header className="bg-[#313131] border-b border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent">
              Daily Task Planner
            </h1>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-300 hover:text-orange-400 transition-colors"
            >
              Home
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
