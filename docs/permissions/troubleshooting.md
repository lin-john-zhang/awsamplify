# Permission Troubleshooting Guide

This guide helps you diagnose and resolve common permission-related issues in AWS Amplify applications.

## Common Permission Errors

### 1. Access Denied Errors

#### GraphQL API Access Denied

```
Error: Not Authorized to access [operation] on type [TypeName]
```

**Possible Causes:**

- User is not authenticated
- User lacks required group membership
- Authorization rule is too restrictive
- Token has expired

**Solutions:**

```javascript
// Check if user is authenticated
import { Auth } from "aws-amplify";

async function checkAuthStatus() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    console.log("User is authenticated:", user);

    // Check user groups
    const groups =
      user.signInUserSession.accessToken.payload["cognito:groups"] || [];
    console.log("User groups:", groups);

    // Check token expiration
    const tokenExpiration =
      user.signInUserSession.accessToken.payload.exp * 1000;
    const now = Date.now();

    if (now > tokenExpiration) {
      console.log("Token has expired, refreshing...");
      await Auth.currentSession(); // This will refresh the token
    }
  } catch (error) {
    console.log("User is not authenticated:", error);
    // Redirect to login
  }
}
```

#### S3 Storage Access Denied

```
Error: Access Denied
```

**Debug Steps:**

```javascript
import { Storage, Auth } from "aws-amplify";

async function debugStorageAccess() {
  try {
    // Check current user identity
    const credentials = await Auth.currentCredentials();
    console.log("Identity ID:", credentials.identityId);

    // Test different access levels
    const accessLevels = ["public", "protected", "private"];

    for (const level of accessLevels) {
      try {
        const files = await Storage.list("", { level });
        console.log(`${level} access: SUCCESS`, files);
      } catch (error) {
        console.log(`${level} access: FAILED`, error.message);
      }
    }
  } catch (error) {
    console.error("Storage debug failed:", error);
  }
}
```

### 2. Token Issues

#### JWT Token Validation Errors

```javascript
// Custom token validation function
function validateJWTToken(token) {
  try {
    // Decode token without verification (for debugging only)
    const payload = JSON.parse(atob(token.split(".")[1]));

    console.log("Token payload:", payload);
    console.log("Token expiration:", new Date(payload.exp * 1000));
    console.log("Token issuer:", payload.iss);
    console.log("Token audience:", payload.aud);
    console.log("User groups:", payload["cognito:groups"]);

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      console.error("Token is expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Invalid token format:", error);
    return false;
  }
}

// Usage
async function checkCurrentToken() {
  try {
    const session = await Auth.currentSession();
    const accessToken = session.getAccessToken().getJwtToken();
    const idToken = session.getIdToken().getJwtToken();

    console.log("Access token valid:", validateJWTToken(accessToken));
    console.log("ID token valid:", validateJWTToken(idToken));
  } catch (error) {
    console.error("Failed to get current session:", error);
  }
}
```

### 3. Group Assignment Issues

#### Check User Group Membership

```javascript
async function checkUserGroups() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    const groups =
      user.signInUserSession.accessToken.payload["cognito:groups"] || [];

    console.log("Current user groups:", groups);

    // Check specific group membership
    const requiredGroups = ["Users", "Admins", "Moderators"];

    requiredGroups.forEach((group) => {
      const hasGroup = groups.includes(group);
      console.log(`Has ${group} group:`, hasGroup);
    });

    return groups;
  } catch (error) {
    console.error("Failed to check user groups:", error);
    return [];
  }
}

// Admin function to add user to group
async function addUserToGroup(username, groupName) {
  try {
    const response = await fetch("/api/admin/add-user-to-group", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        username,
        groupName,
      }),
    });

    if (response.ok) {
      console.log(`User ${username} added to group ${groupName}`);
    } else {
      console.error("Failed to add user to group:", await response.text());
    }
  } catch (error) {
    console.error("Error adding user to group:", error);
  }
}
```

### 4. API Gateway Authorization Issues

#### Debug API Gateway Calls

```javascript
async function debugAPICall(endpoint, method = "GET", body = null) {
  try {
    // Get current session and tokens
    const session = await Auth.currentSession();
    const accessToken = session.getAccessToken().getJwtToken();
    const idToken = session.getIdToken().getJwtToken();

    console.log("Making API call to:", endpoint);
    console.log("Method:", method);
    console.log(
      "Access Token (first 50 chars):",
      accessToken.substring(0, 50) + "..."
    );

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // Try with different authorization headers
    const authMethods = [
      {
        name: "Bearer Access Token",
        headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      },
      {
        name: "Bearer ID Token",
        headers: { ...headers, Authorization: `Bearer ${idToken}` },
      },
      {
        name: "AWS Signature",
        headers: await getAWSSignatureHeaders(endpoint, method, body),
      },
    ];

    for (const authMethod of authMethods) {
      try {
        console.log(`Trying ${authMethod.name}...`);

        const response = await fetch(endpoint, {
          method,
          headers: authMethod.headers,
          body: body ? JSON.stringify(body) : null,
        });

        console.log(`${authMethod.name} - Status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`${authMethod.name} - Success:`, data);
          return data;
        } else {
          const errorText = await response.text();
          console.log(`${authMethod.name} - Error:`, errorText);
        }
      } catch (error) {
        console.log(`${authMethod.name} - Exception:`, error.message);
      }
    }
  } catch (error) {
    console.error("Debug API call failed:", error);
  }
}

async function getAWSSignatureHeaders(endpoint, method, body) {
  // This would require AWS SDK for signature calculation
  // Simplified example
  try {
    const credentials = await Auth.currentCredentials();

    // In a real implementation, you'd use AWS4 signing process
    return {
      Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/...`,
      "X-Amz-Date": new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ""),
      "X-Amz-Security-Token": credentials.sessionToken,
    };
  } catch (error) {
    console.error("Failed to get AWS signature headers:", error);
    return {};
  }
}
```

### 5. GraphQL Resolver Issues

#### Debug GraphQL Operations

```javascript
import { API } from "aws-amplify";

async function debugGraphQLOperation(query, variables = {}) {
  try {
    console.log("GraphQL Query:", query);
    console.log("Variables:", variables);

    // Try with different auth modes
    const authModes = ["userPool", "apiKey", "iam"];

    for (const authMode of authModes) {
      try {
        console.log(`Trying auth mode: ${authMode}`);

        const result = await API.graphql({
          query,
          variables,
          authMode,
        });

        console.log(`${authMode} - Success:`, result);
        return result;
      } catch (error) {
        console.log(`${authMode} - Failed:`, error.message);

        // Log detailed error information
        if (error.errors) {
          error.errors.forEach((err, index) => {
            console.log(`Error ${index + 1}:`, {
              message: err.message,
              path: err.path,
              extensions: err.extensions,
            });
          });
        }
      }
    }
  } catch (error) {
    console.error("GraphQL debug failed:", error);
  }
}

// Test query permissions
async function testQueryPermissions() {
  const testQueries = [
    {
      name: "List Posts (Public)",
      query: `query { listPosts { items { id title } } }`,
      variables: {},
    },
    {
      name: "List Users (Admin)",
      query: `query { listUsers { items { id email } } }`,
      variables: {},
    },
    {
      name: "Get Current User",
      query: `query GetUser($id: ID!) { getUser(id: $id) { id email } }`,
      variables: { id: "current-user-id" },
    },
  ];

  for (const test of testQueries) {
    console.log(`\n--- Testing: ${test.name} ---`);
    await debugGraphQLOperation(test.query, test.variables);
  }
}
```

## Permission Debugging Tools

### 1. Permission Checker Component

```javascript
import React, { useState, useEffect } from "react";
import { Auth, API, Storage } from "aws-amplify";

function PermissionChecker() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runPermissionTests = async () => {
    setLoading(true);
    const testResults = {};

    try {
      // Test authentication
      testResults.auth = await testAuthentication();

      // Test API permissions
      testResults.api = await testAPIPermissions();

      // Test storage permissions
      testResults.storage = await testStoragePermissions();

      setResults(testResults);
    } catch (error) {
      console.error("Permission tests failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const testAuthentication = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      const credentials = await Auth.currentCredentials();

      return {
        status: "success",
        user: {
          id: user.attributes.sub,
          email: user.attributes.email,
          groups:
            user.signInUserSession.accessToken.payload["cognito:groups"] || [],
        },
        session: {
          accessTokenValid: session.isValid(),
          idTokenValid: session.getIdToken().isValid(),
          refreshTokenValid: session.getRefreshToken().isValid(),
        },
        credentials: {
          identityId: credentials.identityId,
          authenticated: credentials.authenticated,
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
      };
    }
  };

  const testAPIPermissions = async () => {
    const tests = [
      { name: "List Posts", query: "query { listPosts { items { id } } }" },
      { name: "List Users", query: "query { listUsers { items { id } } }" },
      {
        name: "List Admin Logs",
        query: "query { listAdminLogs { items { id } } }",
      },
    ];

    const results = {};

    for (const test of tests) {
      try {
        await API.graphql({ query: test.query });
        results[test.name] = { status: "success" };
      } catch (error) {
        results[test.name] = {
          status: "error",
          message: error.message,
        };
      }
    }

    return results;
  };

  const testStoragePermissions = async () => {
    const tests = ["public", "protected", "private"];
    const results = {};

    for (const level of tests) {
      try {
        await Storage.list("", { level });
        results[level] = { status: "success" };
      } catch (error) {
        results[level] = {
          status: "error",
          message: error.message,
        };
      }
    }

    return results;
  };

  return (
    <div
      style={{ padding: "20px", border: "1px solid #ccc", margin: "20px 0" }}
    >
      <h3>Permission Checker</h3>
      <button onClick={runPermissionTests} disabled={loading}>
        {loading ? "Running Tests..." : "Run Permission Tests"}
      </button>

      {Object.keys(results).length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Test Results:</h4>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "10px",
              overflow: "auto",
              fontSize: "12px",
            }}
          >
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default PermissionChecker;
```

### 2. Error Monitoring Setup

```javascript
// Error monitoring utility
class PermissionErrorMonitor {
  constructor() {
    this.errors = [];
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener("error", (event) => {
      this.logError("JavaScript Error", event.error);
    });

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.logError("Unhandled Promise Rejection", event.reason);
    });
  }

  logError(type, error) {
    const errorInfo = {
      type,
      message: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.errors.push(errorInfo);

    // Check if it's a permission-related error
    if (this.isPermissionError(error)) {
      this.handlePermissionError(errorInfo);
    }

    // Send to logging service
    this.sendToLoggingService(errorInfo);
  }

  isPermissionError(error) {
    const permissionKeywords = [
      "unauthorized",
      "access denied",
      "forbidden",
      "not authorized",
      "permission",
      "credentials",
    ];

    const errorMessage = (error.message || error.toString()).toLowerCase();

    return permissionKeywords.some((keyword) => errorMessage.includes(keyword));
  }

  handlePermissionError(errorInfo) {
    console.warn("Permission error detected:", errorInfo);

    // Show user-friendly error message
    this.showPermissionErrorDialog(errorInfo);

    // Try to refresh tokens
    this.attemptTokenRefresh();
  }

  showPermissionErrorDialog(errorInfo) {
    // Custom error dialog implementation
    const dialog = document.createElement("div");
    dialog.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px;
            border-radius: 4px;
            z-index: 9999;
            max-width: 300px;
        `;

    dialog.innerHTML = `
            <h4>Permission Error</h4>
            <p>You don't have permission to perform this action.</p>
            <button onclick="this.parentElement.remove()">Close</button>
        `;

    document.body.appendChild(dialog);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (dialog.parentElement) {
        dialog.remove();
      }
    }, 5000);
  }

  async attemptTokenRefresh() {
    try {
      await Auth.currentSession();
      console.log("Token refresh successful");
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Redirect to login
      Auth.signOut();
    }
  }

  async sendToLoggingService(errorInfo) {
    try {
      await fetch("/api/log-error", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorInfo),
      });
    } catch (error) {
      console.error("Failed to send error to logging service:", error);
    }
  }

  getRecentErrors() {
    return this.errors.slice(-50); // Last 50 errors
  }

  getPermissionErrors() {
    return this.errors.filter((error) =>
      this.isPermissionError({ message: error.message })
    );
  }
}

// Initialize error monitor
const errorMonitor = new PermissionErrorMonitor();

export default errorMonitor;
```

## Best Practices for Permission Debugging

1. **Log Everything**: Enable detailed logging for auth events, API calls, and errors
2. **Test Incrementally**: Test permissions at each level (auth, API, storage)
3. **Use Debug Tools**: Leverage browser dev tools and AWS CloudWatch logs
4. **Validate Tokens**: Always check token validity and group membership
5. **Monitor in Production**: Set up alerting for permission-related errors

## Quick Fixes Checklist

- [ ] User is authenticated and tokens are valid
- [ ] User belongs to required groups
- [ ] API authorization rules are correctly configured
- [ ] Storage bucket policies allow the operation
- [ ] Lambda function has necessary IAM permissions
- [ ] CORS is properly configured for web requests
- [ ] Resource-based policies don't conflict with IAM policies
