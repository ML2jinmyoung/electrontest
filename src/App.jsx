import React, { useState } from 'react';

const API_URL = 'http://localhost:8000';

function App() {
  const [status, setStatus] = useState('idle');
  const [savedResult, setSavedResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectFolder = async () => {
    try {
      setError(null);
      setStatus('selecting');

      // 1. Electron: open native folder dialog & read contents
      const data = await window.electronAPI.selectFolder();
      if (!data) {
        setStatus('idle');
        return;
      }

      setStatus('uploading');

      // 2. Send folder metadata to FastAPI
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      setSavedResult(result);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleOpenPath = async (filePath) => {
    await window.electronAPI.openPath(filePath);
  };

  const handleShowInFolder = async (filePath) => {
    await window.electronAPI.showInFolder(filePath);
  };

  return (
    <div className="app">
      <h1>Folder Upload Manager</h1>

      <div className="upload-section">
        <button
          onClick={handleSelectFolder}
          disabled={status === 'uploading'}
          className="upload-btn"
        >
          {status === 'uploading' ? 'Uploading...' : 'Select & Upload Folder'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {status === 'done' && savedResult && (
        <div className="result-section">
          <div className="success-banner">Save Complete!</div>

          <div className="folder-info">
            <h2>{savedResult.folderName}</h2>
            <p
              className="folder-path clickable"
              onClick={() => handleOpenPath(savedResult.folderPath)}
            >
              {savedResult.folderPath}
            </p>
            <p className="file-count">
              {savedResult.files.length} items saved
            </p>
          </div>

          <div className="file-list">
            <h3>Saved Files & Folders</h3>
            {savedResult.files.map((file, index) => (
              <div key={index} className={`file-item ${file.type}`}>
                <span className="file-icon">
                  {file.type === 'directory' ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}
                </span>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span
                    className="file-path clickable"
                    onClick={() =>
                      file.type === 'directory'
                        ? handleOpenPath(file.path)
                        : handleShowInFolder(file.path)
                    }
                    title="Click to open"
                  >
                    {file.path}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
