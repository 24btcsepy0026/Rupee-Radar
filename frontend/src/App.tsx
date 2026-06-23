import { useEffect, useState } from 'react'
import axios from 'axios'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'

function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [view, setView] = useState<'upload' | 'dashboard'>('upload')

  useEffect(() => {
    axios.get('/api/health/')
      .then(() => {
        setIsConnected(true)
      })
      .catch(() => {
        setIsConnected(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-gray-900 flex flex-col">
      {view === 'upload' ? (
        <>
          {/* Top Header */}
          <header className="w-full bg-[#f3f4f6] px-8 py-6 flex justify-between items-center border-b border-gray-200">
            <div 
              className="cursor-pointer" 
              onClick={() => setView('upload')}
            >
              <h1 className="text-2xl font-bold text-[#10b981] tracking-tight">RupeeRadar</h1>
              <p className="text-sm text-gray-500 mt-1">Personal finance insights from bank statements</p>
            </div>
            <div>
              {isConnected === null ? (
                 <span className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-full text-sm font-medium animate-pulse">Checking...</span>
              ) : isConnected ? (
                 <span className="px-4 py-1.5 bg-[#d1fae5] text-[#065f46] rounded-full text-sm font-medium border border-[#a7f3d0]">API connected</span>
              ) : (
                 <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium border border-red-200">API disconnected</span>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow flex flex-col items-center px-4 pt-12 pb-24">
            <div className="text-center mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold text-[#1e293b] mb-4">Understand where your money goes</h2>
              <p className="text-lg text-gray-500">
                Upload a bank statement CSV or PDF to get categorized transactions and spending insights.
              </p>
            </div>

            <FileUpload onUploadSuccess={() => setView('dashboard')} />
            
            <div className="mt-8 text-sm text-gray-400 font-mono text-center w-full">
              Sample fixture: backend/tests/fixtures/hdfc_messy.csv
              <br/>
              <button 
                onClick={() => setView('dashboard')} 
                className="mt-4 text-[#10b981] underline hover:text-[#059669]"
              >
                Skip to Dashboard (Debug)
              </button>
            </div>
          </main>
        </>
      ) : (
        <Dashboard onUploadAnother={() => setView('upload')} />
      )}
    </div>
  )
}

export default App
