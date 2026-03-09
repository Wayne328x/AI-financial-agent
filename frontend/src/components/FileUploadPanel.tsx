import { useState } from 'react';
import { FileUploadPanelProps } from './types';

const FileUploadPanel = ({ onUpload, isLoading, error, success }: FileUploadPanelProps) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
    }
  };

  const handleUpload = () => {
    if (files.length > 0) {
      onUpload(files);
      // Don't clear files here - let the parent handle state
    }
  };

  return (
    <div className="file-upload">
      <h3>Upload Financial Reports</h3>
      <p>Upload PDF documents to ask questions about their content.</p>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileChange}
        disabled={isLoading}
      />

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || isLoading}
      >
        {isLoading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
      </button>

      {files.length > 0 && (
        <div className="file-list">
          <h4>Selected files:</h4>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploadPanel;