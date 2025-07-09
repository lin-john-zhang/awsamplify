// Demo configuration for testing without AWS deployment
export const demoConfig = {
  isDemoMode: true, // Set to false when AWS is configured
  mockUser: {
    userId: 'demo-user-123',
    signInDetails: {
      loginId: 'demo@example.com'
    },
    attributes: {
      sub: 'demo-user-123',
      email: 'demo@example.com',
      'custom:department': 'Engineering',
      'custom:role': 'Developer'
    },
    signInUserSession: {
      accessToken: {
        payload: {
          'cognito:groups': ['Users', 'Moderators'] // Change this to test different groups
        }
      }
    }
  },
  mockFiles: {
    public: [
      { 
        path: 'public/demo-file-1.pdf', 
        size: 1024, 
        lastModified: new Date('2024-01-15').toISOString() 
      },
      { 
        path: 'public/company-logo.png', 
        size: 2048, 
        lastModified: new Date('2024-01-10').toISOString() 
      }
    ],
    protected: [
      { 
        path: 'protected/demo-user-123/personal-doc.docx', 
        size: 3072, 
        lastModified: new Date('2024-01-20').toISOString() 
      }
    ],
    private: [
      { 
        path: 'private/demo-user-123/confidential.txt', 
        size: 512, 
        lastModified: new Date('2024-01-25').toISOString() 
      }
    ],
    admin: [
      { 
        path: 'admin/system-config.json', 
        size: 1536, 
        lastModified: new Date('2024-01-12').toISOString() 
      }
    ],
    reports: [
      { 
        path: 'reports/monthly-report.xlsx', 
        size: 4096, 
        lastModified: new Date('2024-01-30').toISOString() 
      }
    ],
    department: [
      { 
        path: 'departments/Engineering/team-notes.md', 
        size: 768, 
        lastModified: new Date('2024-01-18').toISOString() 
      }
    ]
  }
};

// Mock storage operations for demo mode
export const mockStorage = {
  uploadData: async ({ path, data, options }) => {
    console.log(`[DEMO] Uploading file to: ${path}`);
    if (options?.onProgress) {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        setTimeout(() => {
          options.onProgress({ loaded: i, total: 100 });
        }, i * 10);
      }
    }
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { path };
  },

  getUrl: async ({ path }) => {
    console.log(`[DEMO] Getting URL for: ${path}`);
    // Return a demo blob URL
    const blob = new Blob(['Demo file content'], { type: 'text/plain' });
    return { url: URL.createObjectURL(blob) };
  },

  list: async ({ path }) => {
    console.log(`[DEMO] Listing files in: ${path}`);
    
    const pathKey = path.replace('/', '').replace('departments/Engineering', 'department');
    return {
      items: demoConfig.mockFiles[pathKey] || []
    };
  },

  remove: async ({ path }) => {
    console.log(`[DEMO] Removing file: ${path}`);
    return true;
  }
};

// Mock auth operations
export const mockAuth = {
  getCurrentUser: async () => {
    console.log('[DEMO] Getting current user');
    return demoConfig.mockUser;
  }
};
