import React, { useState, useEffect } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { API, Auth, Storage } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import StoragePermissionsDemo from './components/StoragePermissionsDemo';
import { demoConfig } from './demo-config';

// Component demonstrating different permission levels
function PermissionsDemo() {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [userGroups, setUserGroups] = useState([]);
    const [posts, setPosts] = useState([]);
    const [adminData, setAdminData] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user) {
            // Extract user groups from JWT token
            const groups = user.signInUserSession.accessToken.payload['cognito:groups'] || [];
            setUserGroups(groups);
            
            loadUserContent();
        }
    }, [user]);

    const loadUserContent = async () => {
        try {
            // Load posts that user can access
            const postsData = await API.graphql({
                query: `
                    query ListPosts {
                        listPosts {
                            items {
                                id
                                title
                                content
                                status
                                published
                                authorId
                                createdAt
                            }
                        }
                    }
                `
            });
            setPosts(postsData.data.listPosts.items);

            // Load admin data if user has permission
            if (userGroups.includes('Admins')) {
                const adminDataResponse = await API.graphql({
                    query: `
                        query ListAdminLogs {
                            listAdminLogs {
                                items {
                                    id
                                    action
                                    resourceType
                                    userEmail
                                    timestamp
                                    severity
                                }
                            }
                        }
                    `
                });
                setAdminData(adminDataResponse.data.listAdminLogs.items);
            }

            // Load user's files
            const files = await Storage.list('', { level: 'private' });
            setUploadedFiles(files);

        } catch (error) {
            console.error('Error loading content:', error);
        }
    };

    const createPost = async (postData) => {
        try {
            const response = await API.graphql({
                query: `
                    mutation CreatePost($input: CreatePostInput!) {
                        createPost(input: $input) {
                            id
                            title
                            content
                            authorId
                            createdAt
                        }
                    }
                `,
                variables: {
                    input: {
                        title: postData.title,
                        content: postData.content,
                        published: false,
                        authorId: user.attributes.sub
                    }
                }
            });
            
            console.log('Post created:', response.data.createPost);
            loadUserContent(); // Refresh the list
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post: ' + error.message);
        }
    };

    const uploadFile = async (file, accessLevel = 'private') => {
        try {
            const result = await Storage.put(
                `documents/${file.name}`,
                file,
                {
                    level: accessLevel,
                    contentType: file.type,
                    metadata: {
                        owner: user.attributes.sub,
                        uploadedAt: new Date().toISOString()
                    }
                }
            );
            
            console.log('File uploaded:', result);
            setUploadedFiles(prev => [...prev, { key: result.key, size: file.size }]);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        }
    };

    const deletePost = async (postId) => {
        try {
            await API.graphql({
                query: `
                    mutation DeletePost($input: DeletePostInput!) {
                        deletePost(input: $input) {
                            id
                        }
                    }
                `,
                variables: {
                    input: { id: postId }
                }
            });
            
            loadUserContent(); // Refresh the list
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post: ' + error.message);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <UserInfo user={user} userGroups={userGroups} signOut={signOut} />
            
            {/* Tab Navigation */}
            <div style={{ 
                borderBottom: '2px solid #ddd', 
                marginBottom: '20px',
                display: 'flex',
                gap: '10px'
            }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        background: activeTab === 'overview' ? '#4CAF50' : 'transparent',
                        color: activeTab === 'overview' ? 'white' : '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'overview' ? 'bold' : 'normal'
                    }}
                >
                    📊 Overview
                </button>
                <button
                    onClick={() => setActiveTab('storage')}
                    style={{
                        background: activeTab === 'storage' ? '#4CAF50' : 'transparent',
                        color: activeTab === 'storage' ? 'white' : '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'storage' ? 'bold' : 'normal'
                    }}
                >
                    🗂️ Storage Permissions
                </button>
                <button
                    onClick={() => setActiveTab('posts')}
                    style={{
                        background: activeTab === 'posts' ? '#4CAF50' : 'transparent',
                        color: activeTab === 'posts' ? 'white' : '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'posts' ? 'bold' : 'normal'
                    }}
                >
                    📝 Posts & API
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div>
                    {userGroups.includes('Admins') && (
                        <AdminPanel adminData={adminData} />
                    )}
                    <OverviewPanel user={user} userGroups={userGroups} />
                </div>
            )}

            {activeTab === 'storage' && (
                <StoragePermissionsDemo />
            )}

            {activeTab === 'posts' && (
                <>
                    {(userGroups.includes('Users') || userGroups.includes('Moderators') || userGroups.includes('Admins')) && (
                        <PostManagement 
                            posts={posts} 
                            createPost={createPost} 
                            deletePost={deletePost}
                            userGroups={userGroups}
                            currentUserId={user.attributes.sub}
                        />
                    )}
                    
                    <FileUpload uploadFile={uploadFile} uploadedFiles={uploadedFiles} />
                </>
            )}
        </div>
    );
}

function OverviewPanel({ user, userGroups }) {
    return (
        <div>
            <div style={{
                background: '#e8f5e8',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #4CAF50'
            }}>
                <h2>🎯 AWS Amplify Permissions Overview</h2>
                <p>This demo showcases comprehensive permission patterns in AWS Amplify Gen 2, including:</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h3>🔐 Authentication & Groups</h3>
                        <ul>
                            <li>User group-based access control</li>
                            <li>Custom user attributes</li>
                            <li>Role-based permissions</li>
                            <li>Multi-factor authentication</li>
                        </ul>
                    </div>
                    
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h3>🗂️ Storage Permissions</h3>
                        <ul>
                            <li>Public, Protected, Private access levels</li>
                            <li>Group-based storage access</li>
                            <li>Department-based file organization</li>
                            <li>Admin-only storage areas</li>
                        </ul>
                    </div>
                    
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h3>📡 API Permissions</h3>
                        <ul>
                            <li>GraphQL field-level security</li>
                            <li>Owner-based resource access</li>
                            <li>Group authorization rules</li>
                            <li>Custom business logic</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div style={{
                background: '#fff3e0',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #ff9800'
            }}>
                <h3>💡 Getting Started</h3>
                <ol>
                    <li><strong>Explore Storage:</strong> Click on "🗂️ Storage Permissions" to see file upload/download with different access levels</li>
                    <li><strong>Test API Access:</strong> Use "📝 Posts & API" to create and manage posts with different permission levels</li>
                    <li><strong>Admin Features:</strong> {userGroups.includes('Admins') ? 'You have admin access - try uploading to admin/ folders!' : 'Sign in as an admin to see additional features'}</li>
                    <li><strong>Group Testing:</strong> Your groups: {userGroups.length > 0 ? userGroups.join(', ') : 'None assigned'}</li>
                </ol>
            </div>

            <div style={{
                background: '#f3e5f5',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #9c27b0'
            }}>
                <h3>🔧 Technical Implementation</h3>
                <p>This demo uses:</p>
                <ul>
                    <li><strong>Amplify Gen 2:</strong> Latest backend configuration with TypeScript</li>
                    <li><strong>S3 Storage:</strong> Fine-grained IAM policies for different access patterns</li>
                    <li><strong>Cognito Groups:</strong> Users, Moderators, Admins with different capabilities</li>
                    <li><strong>Custom Attributes:</strong> Department and role-based access control</li>
                    <li><strong>GraphQL API:</strong> Secure data access with authorization rules</li>
                </ul>
                
                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(156, 39, 176, 0.1)', borderRadius: '4px' }}>
                    <strong>📁 Project Structure:</strong>
                    <pre style={{ fontSize: '12px', margin: '5px 0' }}>
{`/amplify/
  ├── backend.ts              # Main backend configuration
  ├── auth/resource.ts        # Cognito groups & custom attributes
  ├── storage/resource.ts     # S3 bucket with access rules
  └── data/resource.ts        # GraphQL API schema
/docs/permissions/           # Detailed documentation
/src/components/             # React demo components`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

function UserInfo({ user, userGroups, signOut }) {
    return (
        <div style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px'
        }}>
            <h2>User Information</h2>
            <p><strong>Email:</strong> {user.attributes.email}</p>
            <p><strong>User ID:</strong> {user.attributes.sub}</p>
            <p><strong>Groups:</strong> {userGroups.length > 0 ? userGroups.join(', ') : 'None'}</p>
            <button onClick={signOut} style={{ 
                background: '#ff4444', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
            }}>
                Sign Out
            </button>
        </div>
    );
}

function AdminPanel({ adminData }) {
    return (
        <div style={{ 
            background: '#ffebee', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #f44336'
        }}>
            <h2>🔒 Admin Panel</h2>
            <p>This section is only visible to administrators.</p>
            
            <h3>Recent Admin Logs</h3>
            {adminData ? (
                <div style={{ maxHeight: '200px', overflowY: 'scroll' }}>
                    {adminData.slice(0, 10).map(log => (
                        <div key={log.id} style={{ 
                            background: 'white', 
                            padding: '10px', 
                            margin: '5px 0',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}>
                            <strong>{log.action}</strong> - {log.userEmail} 
                            <br />
                            <small>{new Date(log.timestamp).toLocaleString()}</small>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Loading admin data...</p>
            )}
        </div>
    );
}

function PostManagement({ posts, createPost, deletePost, userGroups, currentUserId }) {
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleCreatePost = (e) => {
        e.preventDefault();
        if (newPost.title && newPost.content) {
            createPost(newPost);
            setNewPost({ title: '', content: '' });
            setShowCreateForm(false);
        }
    };

    const canDeletePost = (post) => {
        return post.authorId === currentUserId || 
               userGroups.includes('Admins') || 
               userGroups.includes('Moderators');
    };

    const canCreatePost = userGroups.includes('Users') || 
                         userGroups.includes('Moderators') || 
                         userGroups.includes('Admins');

    return (
        <div style={{ marginBottom: '20px' }}>
            <h2>Posts</h2>
            
            {canCreatePost && (
                <div style={{ marginBottom: '20px' }}>
                    {!showCreateForm ? (
                        <button 
                            onClick={() => setShowCreateForm(true)}
                            style={{
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Create New Post
                        </button>
                    ) : (
                        <form onSubmit={handleCreatePost} style={{
                            background: '#f9f9f9',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #ddd'
                        }}>
                            <h3>Create New Post</h3>
                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Post title"
                                    value={newPost.title}
                                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <textarea
                                    placeholder="Post content"
                                    value={newPost.content}
                                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            <button type="submit" style={{
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}>
                                Create Post
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                style={{
                                    background: '#999',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                </div>
            )}

            <div>
                {posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.id} style={{
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '10px'
                        }}>
                            <h3>{post.title}</h3>
                            <p>{post.content}</p>
                            <div style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                marginTop: '10px'
                            }}>
                                <span>Status: {post.published ? 'Published' : 'Draft'}</span>
                                <span style={{ marginLeft: '15px' }}>
                                    Created: {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                                {post.authorId === currentUserId && (
                                    <span style={{ marginLeft: '15px', color: '#4CAF50' }}>
                                        (Your post)
                                    </span>
                                )}
                            </div>
                            {canDeletePost(post) && (
                                <button
                                    onClick={() => deletePost(post.id)}
                                    style={{
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                        fontSize: '12px'
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <p>No posts available.</p>
                )}
            </div>
        </div>
    );
}

function FileUpload({ uploadFile, uploadedFiles }) {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedAccessLevel, setSelectedAccessLevel] = useState('private');

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setUploadProgress(0);
                await uploadFile(file, selectedAccessLevel);
                setUploadProgress(100);
                event.target.value = ''; // Reset file input
            } catch (error) {
                setUploadProgress(0);
            }
        }
    };

    return (
        <div>
            <h2>File Storage</h2>
            
            <div style={{
                background: '#f9f9f9',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                marginBottom: '20px'
            }}>
                <h3>Upload File</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label>Access Level: </label>
                    <select 
                        value={selectedAccessLevel}
                        onChange={(e) => setSelectedAccessLevel(e.target.value)}
                        style={{ marginLeft: '10px', padding: '5px' }}
                    >
                        <option value="private">Private (only you)</option>
                        <option value="protected">Protected (readable by all, writable by you)</option>
                        <option value="public">Public (accessible by everyone)</option>
                    </select>
                </div>
                
                <input 
                    type="file" 
                    onChange={handleFileUpload}
                    style={{ marginBottom: '10px' }}
                />
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div>Upload Progress: {uploadProgress}%</div>
                )}
                
                <div style={{ fontSize: '12px', color: '#666' }}>
                    <p><strong>Access Levels Explained:</strong></p>
                    <ul>
                        <li><strong>Private:</strong> Only you can read and write</li>
                        <li><strong>Protected:</strong> Everyone can read, only you can write</li>
                        <li><strong>Public:</strong> Everyone can read, only authenticated users can write</li>
                    </ul>
                </div>
            </div>

            <div>
                <h3>Your Uploaded Files</h3>
                {uploadedFiles.length > 0 ? (
                    <div>
                        {uploadedFiles.map((file, index) => (
                            <div key={index} style={{
                                background: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '10px',
                                marginBottom: '5px',
                                fontSize: '14px'
                            }}>
                                <strong>{file.key}</strong>
                                {file.size && <span> ({(file.size / 1024).toFixed(2)} KB)</span>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No files uploaded yet.</p>
                )}
            </div>
        </div>
    );
}

// Main App component with Authenticator
function App() {
    // Demo mode - bypass authenticator
    if (demoConfig.isDemoMode) {
        return (
            <div style={{ 
                fontFamily: 'Arial, sans-serif',
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '20px'
            }}>
                <h1>AWS Amplify Permissions Demo</h1>
                <DemoPermissionsComponent />
            </div>
        );
    }

    return (
        <Authenticator
            socialProviders={['google', 'facebook']}
            signUpAttributes={['email']}
        >
            {({ signOut, user }) => (
                <div style={{ 
                    fontFamily: 'Arial, sans-serif',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '20px'
                }}>
                    <h1>AWS Amplify Permissions Demo</h1>
                    <PermissionsDemo />
                </div>
            )}
        </Authenticator>
    );
}

// Demo component that works without authentication
function DemoPermissionsComponent() {
    const [activeTab, setActiveTab] = useState('overview');
    const mockUser = demoConfig.mockUser;
    const userGroups = mockUser.signInUserSession.accessToken.payload['cognito:groups'];

    const mockSignOut = () => {
        alert('This is demo mode - sign out simulation');
    };

    return (
        <div style={{ padding: '20px' }}>
            <DemoUserInfo user={mockUser} userGroups={userGroups} signOut={mockSignOut} />
            
            {/* Tab Navigation */}
            <div style={{ 
                borderBottom: '2px solid #ddd', 
                marginBottom: '20px',
                display: 'flex',
                gap: '10px'
            }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        background: activeTab === 'overview' ? '#4CAF50' : 'transparent',
                        color: activeTab === 'overview' ? 'white' : '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'overview' ? 'bold' : 'normal'
                    }}
                >
                    📊 Overview
                </button>
                <button
                    onClick={() => setActiveTab('storage')}
                    style={{
                        background: activeTab === 'storage' ? '#4CAF50' : 'transparent',
                        color: activeTab === 'storage' ? 'white' : '#333',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'storage' ? 'bold' : 'normal'
                    }}
                >
                    🗂️ Storage Permissions
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <OverviewPanel user={mockUser} userGroups={userGroups} />
            )}

            {activeTab === 'storage' && (
                <StoragePermissionsDemo />
            )}
        </div>
    );
}

function DemoUserInfo({ user, userGroups, signOut }) {
    return (
        <div style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px'
        }}>
            <h2>User Information (Demo Mode)</h2>
            <p><strong>Email:</strong> {user.attributes.email}</p>
            <p><strong>User ID:</strong> {user.attributes.sub}</p>
            <p><strong>Groups:</strong> {userGroups.length > 0 ? userGroups.join(', ') : 'None'}</p>
            <p><strong>Department:</strong> {user.attributes['custom:department']}</p>
            <p><strong>Role:</strong> {user.attributes['custom:role']}</p>
            <button onClick={signOut} style={{ 
                background: '#ff4444', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
            }}>
                Sign Out (Demo)
            </button>
        </div>
    );
}

export default App;
