import { useState } from 'react'
import axios from 'axios'

const Chat = () => {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const res = await axios.post('/api/v1/query', { query })
      setResponse(res.data.response)
    } catch (error) {
      console.error('Query failed', error)
      setResponse('Error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question about the financial reports"
      />
      <button onClick={handleQuery} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask'}
      </button>
      <div>
        <h3>Response:</h3>
        <p>{response}</p>
      </div>
    </div>
  )
}

export default Chat