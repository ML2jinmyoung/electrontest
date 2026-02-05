import React, { useState } from 'react';

function App() {
  const [status, setStatus] = useState('idle');
  const [folderData, setFolderData] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectFolder = async () => {
    try {
      setError(null);
      setStatus('selecting');

      const data = await window.electronAPI.selectFolder();
      if (!data) {
        setStatus('idle');
        return;
      }

      setFolderData(data);
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
      <h1>Folder Viewer</h1>

      <div className="upload-section">
        <button onClick={handleSelectFolder} className="upload-btn">
          Select Folder
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {status === 'done' && folderData && (
        <div className="result-section">
          <div className="success-banner">Loaded!</div>

          <div className="folder-info">
            <h2>{folderData.folderName}</h2>
            <p
              className="folder-path clickable"
              onClick={() => handleOpenPath(folderData.folderPath)}
            >
              {folderData.folderPath}
            </p>
            <p className="file-count">
              {folderData.files.length} items
            </p>
          </div>

          <div className="file-list">
            <h3>Files & Folders</h3>
            {folderData.files.map((file, index) => (
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
