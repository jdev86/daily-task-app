import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import Header from './components/Header'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#151411] text-white">
        <Header />
        <main className="bg-[#151411] min-h-[calc(100vh-73px)]">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App 