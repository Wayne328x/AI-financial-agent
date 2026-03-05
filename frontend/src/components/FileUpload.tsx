import { useState } from 'react'
import axios from 'axios'

interface FileUploadProps {
  onUpload: () => void
}

const FileUpload = ({ onUpload }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await axios.post('/api/v1/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      onUpload()
    } catch (error) {
      console.error('Upload failed', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
    </div>
  )
}

export default FileUpload