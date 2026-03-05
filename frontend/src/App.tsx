import { useState } from 'react'
import './App.css'
import FileUpload from './components/FileUpload'
import Chat from './components/Chat'

function App() {
  const [uploaded, setUploaded] = useState(false)

  return (
    <div className="App">
      <h1>AI Financial Research Assistant</h1>
      {!uploaded ? (
        <FileUpload onUpload={() => setUploaded(true)} />
      ) : (
        <Chat />
      )}
    </div>
  )
}

export default App