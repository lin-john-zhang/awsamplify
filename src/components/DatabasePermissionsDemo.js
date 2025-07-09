import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import { demoConfig } from '../demo-config';

// Mock GraphQL client for demo mode
const mockClient = {
  models: {
    Post: {
      list: async () => ({
        data: [
          { id: '1', title: 'Demo Post 1', content: 'This is a demo post', status: 'PUBLISHED', published: true, createdAt: new Date().toISOString() },
          { id: '2', title: 'Admin Only Post', content: 'Admin content', status: 'DRAFT', published: false, createdAt: new Date().toISOString() }
        ]
      }),
      create: async (input) => ({
        data: { ...input, id: Date.now().toString(), createdAt: new Date().toISOString() }
      }),
      delete: async (id) => ({ data: { id } })
    },
    UserProfile: {
      list: async () => ({
        data: [
          { id: '1', displayName: 'Demo User', department: 'Engineering', role: 'Developer', isActive: true },
          { id: '2', displayName: 'Admin User', department: 'IT', role: 'Administrator', isActive: true }
        ]
      }),
      create: async (input) => ({
        data: { ...input, id: Date.now().toString(), createdAt: new Date().toISOString() }
      })
    },
    AdminLog: {
      list: async () => ({
        data: [
          { id: '1', action: 'USER_LOGIN', resourceType: 'Auth', userEmail: 'demo@example.com', timestamp: new Date().toISOString(), severity: 'LOW' },
          { id: '2', action: 'FILE_UPLOAD', resourceType: 'Storage', userEmail: 'demo@example.com', timestamp: new Date().toISOString(), severity: 'MEDIUM' }
        ]
      })
    },
    FileMetadata: {
      list: async () => ({
        data: [
          { id: '1', fileName: 'demo-file.pdf', filePath: 'public/demo-file.pdf', fileSize: 1024, accessLevel: 'PUBLIC', uploadedAt: new Date().toISOString() },
          { id: '2', fileName: 'private-doc.docx', filePath: 'private/private-doc.docx', fileSize: 2048, accessLevel: 'PRIVATE', uploadedAt: new Date().toISOString() }
        ]
      })
    },
    UserQuota: {
      list: async () => ({
        data: [
          { id: '1', storageUsed: 5242880, storageLimit: 1073741824, apiCallsUsed: 150, apiCallsLimit: 10000, isLimitExceeded: false }
        ]
      })
    },
    Todo: {
      list: async () => ({
        data: [
          { id: '1', content: 'Demo task 1', isComplete: false, priority: 'HIGH', createdAt: new Date().toISOString() },
          { id: '2', content: 'Demo task 2', isComplete: true, priority: 'MEDIUM', createdAt: new Date().toISOString() }
        ]
      }),
      create: async (input) => ({
        data: { ...input, id: Date.now().toString(), createdAt: new Date().toISOString() }
      })
    }
  }
};

const DatabasePermissionsDemo = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [data, setData] = useState({
    posts: [],
    userProfiles: [],
    adminLogs: [],
    fileMetadata: [],
    userQuotas: [],
    todos: []
  });
  const [loading, setLoading] = useState({});
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [newTodo, setNewTodo] = useState({ content: '', priority: 'MEDIUM' });

  const client = demoConfig.isDemoMode ? mockClient : generateClient();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      if (demoConfig.isDemoMode) {
        setCurrentUser(demoConfig.mockUser);
        setUserGroups(demoConfig.mockUser.signInUserSession.accessToken.payload['cognito:groups']);
      } else {
        const user = await getCurrentUser();
        setCurrentUser(user);
        const groups = user.signInUserSession?.accessToken?.payload['cognito:groups'] || [];
        setUserGroups(groups);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadAllData = async () => {
    const loadOperations = [
      { key: 'posts', operation: () => client.models.Post.list() },
      { key: 'userProfiles', operation: () => client.models.UserProfile.list() },
      { key: 'fileMetadata', operation: () => client.models.FileMetadata.list() },
      { key: 'userQuotas', operation: () => client.models.UserQuota.list() },
      { key: 'todos', operation: () => client.models.Todo.list() }
    ];

    // Add admin-only data if user is admin
    if (userGroups.includes('Admins')) {
      loadOperations.push({ key: 'adminLogs', operation: () => client.models.AdminLog.list() });
    }

    for (const { key, operation } of loadOperations) {
      try {
        setLoading(prev => ({ ...prev, [key]: true }));
        const result = await operation();
        setData(prev => ({ ...prev, [key]: result.data || [] }));
      } catch (error) {
        console.error(`Error loading ${key}:`, error);
        setData(prev => ({ ...prev, [key]: [] }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const createPost = async () => {
    if (!newPost.title || !newPost.content) return;

    try {
      setLoading(prev => ({ ...prev, createPost: true }));
      const result = await client.models.Post.create({
        ...newPost,
        status: 'DRAFT',
        published: false
      });
      
      setData(prev => ({ ...prev, posts: [...prev.posts, result.data] }));
      setNewPost({ title: '', content: '' });
    } catch (error) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, createPost: false }));
    }
  };

  const createTodo = async () => {
    if (!newTodo.content) return;

    try {
      setLoading(prev => ({ ...prev, createTodo: true }));
      const result = await client.models.Todo.create({
        ...newTodo,
        isComplete: false
      });
      
      setData(prev => ({ ...prev, todos: [...prev.todos, result.data] }));
      setNewTodo({ content: '', priority: 'MEDIUM' });
    } catch (error) {
      console.error('Error creating todo:', error);
      alert(`Failed to create todo: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, createTodo: false }));
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await client.models.Post.delete({ id });
      setData(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== id) }));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(`Failed to delete post: ${error.message}`);
    }
  };

  const renderDataTable = (title, dataArray, columns, canCreate = false, canDelete = false) => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      background: 'white'
    }}>
      <h3>{title} ({dataArray.length} items)</h3>
      
      {loading[title.toLowerCase().replace(' ', '')] ? (
        <p>Loading...</p>
      ) : dataArray.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>
                    {col.label}
                  </th>
                ))}
                {canDelete && <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {dataArray.map((item, index) => (
                <tr key={item.id || index}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {col.render ? col.render(item[col.key], item) : (item[col.key] || 'N/A')}
                    </td>
                  ))}
                  {canDelete && (
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => deletePost(item.id)}
                        style={{
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No data available</p>
      )}
    </div>
  );

  if (!currentUser) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Database Permissions Demo</h2>
        <p>Please sign in to explore database permissions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🗄️ DynamoDB Permissions Demo</h1>
      
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
          <h3>🧪 Demo Mode - Database Simulation</h3>
          <p>This demo shows database operations with mock data. In production mode, this would interact with real DynamoDB tables.</p>
        </div>
      )}

      {/* User Info */}
      <div style={{
        background: '#e8f4f8',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #0288d1'
      }}>
        <h2>👤 Database Access Summary</h2>
        <p><strong>User:</strong> {currentUser.signInDetails?.loginId || currentUser.attributes?.email}</p>
        <p><strong>Groups:</strong> {userGroups.join(', ') || 'None'}</p>
        <p><strong>Database Permissions:</strong></p>
        <ul>
          <li>✅ <strong>Posts:</strong> Can create own, read all published, {userGroups.includes('Admins') ? 'manage all' : 'manage own'}</li>
          <li>✅ <strong>User Profiles:</strong> Can manage own, read others basic info</li>
          <li>{userGroups.includes('Admins') ? '✅' : '❌'} <strong>Admin Logs:</strong> {userGroups.includes('Admins') ? 'Full read access' : 'No access'}</li>
          <li>✅ <strong>File Metadata:</strong> Can manage own files, read public files</li>
          <li>✅ <strong>User Quotas:</strong> Can read own quota</li>
          <li>✅ <strong>Todos:</strong> Can manage own todos</li>
        </ul>
      </div>

      {/* Create Post Form */}
      <div style={{
        background: '#f9f9f9',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd'
      }}>
        <h3>📝 Create New Post</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Post title"
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            onClick={createPost}
            disabled={loading.createPost || !newPost.title}
            style={{
              background: newPost.title ? '#4CAF50' : '#cccccc',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: newPost.title ? 'pointer' : 'not-allowed'
            }}
          >
            {loading.createPost ? 'Creating...' : 'Create Post'}
          </button>
        </div>
        <textarea
          placeholder="Post content"
          value={newPost.content}
          onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
          rows={3}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Create Todo Form */}
      <div style={{
        background: '#f0f8f0',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #4CAF50'
      }}>
        <h3>✅ Create New Todo</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Todo content"
            value={newTodo.content}
            onChange={(e) => setNewTodo(prev => ({ ...prev, content: e.target.value }))}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <select
            value={newTodo.priority}
            onChange={(e) => setNewTodo(prev => ({ ...prev, priority: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <button
            onClick={createTodo}
            disabled={loading.createTodo || !newTodo.content}
            style={{
              background: newTodo.content ? '#4CAF50' : '#cccccc',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: newTodo.content ? 'pointer' : 'not-allowed'
            }}
          >
            {loading.createTodo ? 'Creating...' : 'Add Todo'}
          </button>
        </div>
      </div>

      {/* Data Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
        
        {/* Posts */}
        {renderDataTable('Posts', data.posts, [
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status', render: (val) => <span style={{ 
            background: val === 'PUBLISHED' ? '#4CAF50' : '#ff9800', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>{val}</span> },
          { key: 'published', label: 'Published', render: (val) => val ? '✅' : '❌' },
          { key: 'createdAt', label: 'Created', render: (val) => new Date(val).toLocaleDateString() }
        ], true, userGroups.includes('Admins'))}

        {/* User Profiles */}
        {renderDataTable('User Profiles', data.userProfiles, [
          { key: 'displayName', label: 'Name' },
          { key: 'department', label: 'Department' },
          { key: 'role', label: 'Role' },
          { key: 'isActive', label: 'Active', render: (val) => val ? '✅' : '❌' }
        ])}

        {/* File Metadata */}
        {renderDataTable('File Metadata', data.fileMetadata, [
          { key: 'fileName', label: 'File Name' },
          { key: 'accessLevel', label: 'Access Level', render: (val) => <span style={{ 
            background: val === 'PUBLIC' ? '#4CAF50' : val === 'PRIVATE' ? '#f44336' : '#ff9800', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>{val}</span> },
          { key: 'fileSize', label: 'Size', render: (val) => `${(val / 1024).toFixed(2)} KB` },
          { key: 'uploadedAt', label: 'Uploaded', render: (val) => new Date(val).toLocaleDateString() }
        ])}

        {/* User Quotas */}
        {renderDataTable('User Quotas', data.userQuotas, [
          { key: 'storageUsed', label: 'Storage Used', render: (val) => `${(val / 1048576).toFixed(2)} MB` },
          { key: 'storageLimit', label: 'Storage Limit', render: (val) => `${(val / 1073741824).toFixed(2)} GB` },
          { key: 'apiCallsUsed', label: 'API Calls' },
          { key: 'isLimitExceeded', label: 'Limit Exceeded', render: (val) => val ? '🚨' : '✅' }
        ])}

        {/* Todos */}
        {renderDataTable('Todos', data.todos, [
          { key: 'content', label: 'Task' },
          { key: 'priority', label: 'Priority', render: (val) => <span style={{ 
            background: val === 'HIGH' ? '#f44336' : val === 'MEDIUM' ? '#ff9800' : '#4CAF50', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>{val}</span> },
          { key: 'isComplete', label: 'Complete', render: (val) => val ? '✅' : '⏳' },
          { key: 'createdAt', label: 'Created', render: (val) => new Date(val).toLocaleDateString() }
        ])}

        {/* Admin Logs - Only visible to admins */}
        {userGroups.includes('Admins') && renderDataTable('Admin Logs', data.adminLogs, [
          { key: 'action', label: 'Action' },
          { key: 'resourceType', label: 'Resource' },
          { key: 'userEmail', label: 'User' },
          { key: 'severity', label: 'Severity', render: (val) => <span style={{ 
            background: val === 'CRITICAL' ? '#f44336' : val === 'HIGH' ? '#ff5722' : val === 'MEDIUM' ? '#ff9800' : '#4CAF50', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>{val}</span> },
          { key: 'timestamp', label: 'Time', render: (val) => new Date(val).toLocaleString() }
        ])}
      </div>

      {/* Permission Testing Info */}
      <div style={{
        background: '#fff3e0',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px',
        border: '1px solid #ff9800'
      }}>
        <h3>🧪 Testing Database Permissions</h3>
        <p>This demo showcases the following DynamoDB permission patterns:</p>
        <ul>
          <li><strong>Owner-based Access:</strong> Users can only modify their own posts and todos</li>
          <li><strong>Group-based Access:</strong> Admins can see admin logs, moderators have special post permissions</li>
          <li><strong>Attribute-based Access:</strong> Department-specific access to documents</li>
          <li><strong>Field-level Security:</strong> Different read/write permissions for different fields</li>
          <li><strong>Conditional Access:</strong> Published posts readable by all, drafts only by owners</li>
        </ul>
        
        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px' }}>
          <strong>🔐 Your Current Access Level:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>Can create and manage your own content</li>
            <li>Can read public and published content</li>
            {userGroups.includes('Admins') && <li>🔑 Admin access: Can view admin logs and manage all content</li>}
            {userGroups.includes('Moderators') && <li>⚖️ Moderator access: Can moderate content and comments</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DatabasePermissionsDemo;
