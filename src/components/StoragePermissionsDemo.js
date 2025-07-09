import React, { useState, useEffect } from 'react';
import { uploadData, getUrl, list, remove } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { demoConfig, mockStorage, mockAuth } from '../demo-config';

const StoragePermissionsDemo = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [files, setFiles] = useState({
    public: [],
    protected: [],
    private: [],
    admin: [],
    reports: [],
    department: []
  });
  const [uploadStatus, setUploadStatus] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadPath, setUploadPath] = useState('public');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadFiles();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const user = demoConfig.isDemoMode ? await mockAuth.getCurrentUser() : await getCurrentUser();
      setCurrentUser(user);
      
      // Extract groups from user attributes (this would come from JWT in real app)
      const groups = user.signInUserSession?.accessToken?.payload['cognito:groups'] || [];
      setUserGroups(groups);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadFiles = async () => {
    const fileTypes = ['public', 'protected', 'private'];
    const newFiles = {};

    for (const type of fileTypes) {
      try {
        const storageApi = demoConfig.isDemoMode ? mockStorage : { list };
        const result = await storageApi.list({
          path: `${type}/`,
          options: {
            listAll: true
          }
        });
        newFiles[type] = result.items || [];
      } catch (error) {
        console.error(`Error loading ${type} files:`, error);
        newFiles[type] = [];
      }
    }

    // Load admin files if user is admin
    if (userGroups.includes('Admins')) {
      try {
        const storageApi = demoConfig.isDemoMode ? mockStorage : { list };
        const adminFiles = await storageApi.list({
          path: 'admin/',
          options: { listAll: true }
        });
        newFiles.admin = adminFiles.items || [];

        const reportFiles = await storageApi.list({
          path: 'reports/',
          options: { listAll: true }
        });
        newFiles.reports = reportFiles.items || [];
      } catch (error) {
        console.error('Error loading admin files:', error);
        newFiles.admin = [];
        newFiles.reports = [];
      }
    }

    // Load department files if user has department attribute
    const userDepartment = currentUser.attributes?.['custom:department'];
    if (userDepartment) {
      try {
        const storageApi = demoConfig.isDemoMode ? mockStorage : { list };
        const deptFiles = await storageApi.list({
          path: `departments/${userDepartment}/`,
          options: { listAll: true }
        });
        newFiles.department = deptFiles.items || [];
      } catch (error) {
        console.error('Error loading department files:', error);
        newFiles.department = [];
      }
    }

    setFiles(newFiles);
  };

  const handleFileUpload = async (accessLevel) => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    const fileName = selectedFile.name;
    const fileKey = `${accessLevel}/${Date.now()}_${fileName}`;
    
    setUploadStatus(prev => ({ ...prev, [fileKey]: 'uploading' }));

    try {
      const storageApi = demoConfig.isDemoMode ? mockStorage : { uploadData };
      const result = await storageApi.uploadData({
        path: fileKey,
        data: selectedFile,
        options: {
          onProgress: (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            setUploadStatus(prev => ({ 
              ...prev, 
              [fileKey]: `uploading ${percentage}%` 
            }));
          }
        }
      });

      setUploadStatus(prev => ({ ...prev, [fileKey]: 'completed' }));
      console.log('Upload successful:', result);
      
      // Refresh file list
      await loadFiles();
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus(prev => ({ ...prev, [fileKey]: 'failed' }));
      alert(`Upload failed: ${error.message}`);
    }
  };

  const handleFileDownload = async (filePath) => {
    try {
      const storageApi = demoConfig.isDemoMode ? mockStorage : { getUrl };
      const url = await storageApi.getUrl({
        path: filePath,
        options: {
          expiresIn: 300 // 5 minutes
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.href = url.url.toString();
      link.download = filePath.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const handleFileDelete = async (filePath) => {
    if (!window.confirm(`Are you sure you want to delete ${filePath}?`)) {
      return;
    }

    try {
      const storageApi = demoConfig.isDemoMode ? mockStorage : { remove };
      await storageApi.remove({
        path: filePath
      });
      
      console.log('File deleted successfully');
      await loadFiles(); // Refresh file list
      
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const getUploadPaths = () => {
    const paths = ['public', 'protected', 'private'];
    
    if (userGroups.includes('Admins')) {
      paths.push('admin', 'reports', 'backups');
    }
    
    if (userGroups.includes('Moderators') || userGroups.includes('Admins')) {
      paths.push('moderators');
    }

    const userDepartment = currentUser?.attributes?.['custom:department'];
    if (userDepartment) {
      paths.push(`departments/${userDepartment}`);
    }

    return paths;
  };

  const renderFileList = (fileList, title, canDelete = false) => (
    <div style={{ marginBottom: '20px' }}>
      <h3>{title} ({fileList.length} files)</h3>
      {fileList.length > 0 ? (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {fileList.map((file, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              border: '1px solid #ddd',
              marginBottom: '4px',
              borderRadius: '4px'
            }}>
              <div>
                <strong>{file.path}</strong>
                <br />
                <small>
                  Size: {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown'} | 
                  Modified: {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Unknown'}
                </small>
              </div>
              <div>
                <button
                  onClick={() => handleFileDownload(file.path)}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '5px',
                    fontSize: '12px'
                  }}
                >
                  Download
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleFileDelete(file.path)}
                    style={{
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No files found</p>
      )}
    </div>
  );

  if (!currentUser) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Storage Permissions Demo</h2>
        <p>Please sign in to explore storage permissions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🗂️ AWS Amplify Storage Permissions Demo</h1>
      
      {/* Demo Mode Indicator */}
      {demoConfig.isDemoMode && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#856404'
        }}>
          <h3>🧪 Demo Mode Active</h3>
          <p>This demo is running in offline mode with mock data. To use real AWS services:</p>
          <ol>
            <li>Configure your AWS credentials and region</li>
            <li>Run <code>npx ampx sandbox</code> to deploy the backend</li>
            <li>Set <code>isDemoMode: false</code> in <code>src/demo-config.js</code></li>
          </ol>
        </div>
      )}
      
      {/* User Info */}
      <div style={{
        background: '#f0f8ff',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #0066cc'
      }}>
        <h2>👤 Current User Information</h2>
        <p><strong>User ID:</strong> {currentUser.userId}</p>
        <p><strong>Email:</strong> {currentUser.signInDetails?.loginId}</p>
        <p><strong>Groups:</strong> {userGroups.length > 0 ? userGroups.join(', ') : 'None'}</p>
        <p><strong>Department:</strong> {currentUser.attributes?.['custom:department'] || 'Not set'}</p>
        <p><strong>Role:</strong> {currentUser.attributes?.['custom:role'] || 'Not set'}</p>
      </div>

      {/* File Upload Section */}
      <div style={{
        background: '#f9f9f9',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h2>📤 File Upload</h2>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ marginRight: '10px' }}
          />
          <select
            value={uploadPath}
            onChange={(e) => setUploadPath(e.target.value)}
            style={{ marginRight: '10px', padding: '5px' }}
          >
            {getUploadPaths().map(path => (
              <option key={path} value={path}>{path}</option>
            ))}
          </select>
          <button
            onClick={() => handleFileUpload(uploadPath)}
            disabled={!selectedFile}
            style={{
              background: selectedFile ? '#4CAF50' : '#cccccc',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: selectedFile ? 'pointer' : 'not-allowed'
            }}
          >
            Upload to {uploadPath}
          </button>
        </div>

        {/* Upload Status */}
        {Object.keys(uploadStatus).length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <h4>Upload Status:</h4>
            {Object.entries(uploadStatus).map(([key, status]) => (
              <div key={key} style={{
                padding: '5px',
                background: status === 'completed' ? '#d4edda' : 
                           status === 'failed' ? '#f8d7da' : '#fff3cd',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '2px',
                fontSize: '12px'
              }}>
                {key}: {status}
              </div>
            ))}
          </div>
        )}

        {/* Access Level Explanations */}
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
          <h4>Access Level Explanations:</h4>
          <ul>
            <li><strong>public/</strong> - Anyone can read, authenticated users can write</li>
            <li><strong>protected/</strong> - Everyone can read, only owner can write</li>
            <li><strong>private/</strong> - Only owner can access</li>
            <li><strong>admin/</strong> - Only admin group can access</li>
            <li><strong>reports/</strong> - Admins can read/write, moderators can read</li>
            <li><strong>departments/</strong> - Access based on user's department attribute</li>
          </ul>
        </div>
      </div>

      {/* File Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Public Files */}
        <div style={{ border: '1px solid #4CAF50', borderRadius: '8px', padding: '15px' }}>
          {renderFileList(files.public, '🌐 Public Files', true)}
        </div>

        {/* Protected Files */}
        <div style={{ border: '1px solid #FF9800', borderRadius: '8px', padding: '15px' }}>
          {renderFileList(files.protected, '🛡️ Protected Files', true)}
        </div>

        {/* Private Files */}
        <div style={{ border: '1px solid #F44336', borderRadius: '8px', padding: '15px' }}>
          {renderFileList(files.private, '🔒 Private Files', true)}
        </div>

        {/* Admin Files - Only visible to admins */}
        {userGroups.includes('Admins') && (
          <>
            <div style={{ border: '1px solid #9C27B0', borderRadius: '8px', padding: '15px' }}>
              {renderFileList(files.admin, '👑 Admin Files', true)}
            </div>

            <div style={{ border: '1px solid #3F51B5', borderRadius: '8px', padding: '15px' }}>
              {renderFileList(files.reports, '📊 Reports', true)}
            </div>
          </>
        )}

        {/* Department Files */}
        {currentUser.attributes?.['custom:department'] && (
          <div style={{ border: '1px solid #607D8B', borderRadius: '8px', padding: '15px' }}>
            {renderFileList(files.department, `🏢 Department Files (${currentUser.attributes['custom:department']})`, true)}
          </div>
        )}
      </div>

      {/* Permission Testing Section */}
      <div style={{
        background: '#fff3e0',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '1px solid #ff9800'
      }}>
        <h2>🧪 Permission Testing</h2>
        <p>Try uploading files to different access levels to see how permissions work:</p>
        <ul>
          <li>Upload to <strong>public/</strong> - Should work for any authenticated user</li>
          <li>Upload to <strong>private/</strong> - Creates user-specific folder automatically</li>
          <li>Upload to <strong>admin/</strong> - Only works if you're in the Admins group</li>
          <li>Try accessing files uploaded by other users in protected/ folders</li>
        </ul>
        
        <div style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '4px' }}>
          <strong>Current Permissions Summary:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>✅ Can upload to: {getUploadPaths().join(', ')}</li>
            <li>✅ Can read from: public/, protected/, private/ (own files){userGroups.includes('Admins') ? ', admin/, reports/' : ''}</li>
            <li>✅ Can delete from: Files you own + {userGroups.includes('Admins') ? 'all admin areas' : 'your private files'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoragePermissionsDemo;
