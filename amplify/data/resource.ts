import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Comprehensive data schema demonstrating various permission patterns
 * for DynamoDB access control in AWS Amplify Gen 2
 */
const schema = a.schema({
  // Posts with owner-based and group-based access
  Post: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      status: a.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
      published: a.boolean().default(false),
      authorId: a.string().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      tags: a.string().array(),
      viewCount: a.integer().default(0),
    })
    .authorization((allow) => [
      // Owner can perform all operations
      allow.owner().to(['create', 'read', 'update', 'delete']),
      // All authenticated users can read
      allow.authenticated().to(['read']),
      // Moderators can read and update any post
      allow.groups(['Moderators', 'Admins']).to(['read', 'update']),
      // Admins have full access
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
    ]),

  // User profiles with custom attribute-based access
  UserProfile: a
    .model({
      email: a.email(),
      displayName: a.string(),
      department: a.string(),
      role: a.string(),
      clearanceLevel: a.integer().default(1),
      profilePicture: a.url(),
      bio: a.string(),
      isActive: a.boolean().default(true),
      lastLoginAt: a.datetime(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      // Users can read their own profile and create it
      allow.owner().to(['create', 'read', 'update']),
      // Users can read other users' basic info (limited fields)
      allow.authenticated().to(['read']),
      // Admins have full access to all profiles
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
      // HR group can read all profiles but not delete
      allow.groups(['HR']).to(['read', 'update']),
    ]),

  // Admin logs - restricted access
  AdminLog: a
    .model({
      action: a.string().required(),
      resourceType: a.string().required(),
      resourceId: a.string(),
      userEmail: a.string().required(),
      userId: a.string().required(),
      timestamp: a.datetime().required(),
      severity: a.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      details: a.json(),
      ipAddress: a.string(),
    })
    .authorization((allow) => [
      // Only admins can access admin logs
      allow.groups(['Admins']).to(['create', 'read']),
      // Public API can create logs (for system operations)
      allow.publicApiKey().to(['create']),
    ]),

  // Department documents with department-based access
  DepartmentDocument: a
    .model({
      title: a.string().required(),
      content: a.string(),
      department: a.string().required(),
      documentType: a.enum(['POLICY', 'PROCEDURE', 'MEMO', 'REPORT']),
      isConfidential: a.boolean().default(false),
      approvedBy: a.string(),
      approvedAt: a.datetime(),
      expiresAt: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      // Document authors can manage their own docs
      allow.owner().to(['create', 'read', 'update', 'delete']),
      // All authenticated users can read non-confidential docs
      allow.authenticated().to(['read']),
      // Department heads can manage all department docs
      allow.groups(['DepartmentHeads']).to(['create', 'read', 'update', 'delete']),
      // Admins have full access
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
    ]),

  // File metadata for S3 integration
  FileMetadata: a
    .model({
      fileName: a.string().required(),
      filePath: a.string().required(),
      fileSize: a.integer(),
      mimeType: a.string(),
      accessLevel: a.enum(['PUBLIC', 'PROTECTED', 'PRIVATE', 'ADMIN']),
      department: a.string(),
      tags: a.string().array(),
      uploadedAt: a.datetime(),
      lastAccessedAt: a.datetime(),
      downloadCount: a.integer().default(0),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [
      // Owner can manage their files
      allow.owner().to(['create', 'read', 'update', 'delete']),
      // Authenticated users can read public files
      allow.authenticated().to(['read']),
      // Admins have full access
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
    ]),

  // User quotas and usage tracking
  UserQuota: a
    .model({
      storageUsed: a.integer().default(0),
      storageLimit: a.integer().default(1073741824), // 1GB default
      apiCallsUsed: a.integer().default(0),
      apiCallsLimit: a.integer().default(10000),
      lastResetAt: a.datetime(),
      isLimitExceeded: a.boolean().default(false),
    })
    .authorization((allow) => [
      // Users can read their own quota
      allow.owner().to(['read']),
      // Public API can update quotas (for system operations)
      allow.publicApiKey().to(['create', 'update']),
      // Admins can manage all quotas
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Audit trail for security monitoring
  AuditTrail: a
    .model({
      userId: a.string().required(),
      action: a.string().required(),
      resource: a.string(),
      success: a.boolean(),
      errorMessage: a.string(),
      ipAddress: a.string(),
      userAgent: a.string(),
      timestamp: a.datetime().required(),
      sessionId: a.string(),
    })
    .authorization((allow) => [
      // Only admins and security team can access audit trails
      allow.groups(['Admins', 'SecurityTeam']).to(['read']),
      // Public API can create audit entries (for system logging)
      allow.publicApiKey().to(['create']),
    ]),

  // Comments system with nested permissions
  Comment: a
    .model({
      postId: a.string().required(),
      content: a.string().required(),
      authorName: a.string(),
      isApproved: a.boolean().default(false),
      isReported: a.boolean().default(false),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      // Users can create comments
      allow.authenticated().to(['create']),
      // Users can read approved comments
      allow.authenticated().to(['read']),
      // Users can edit their own comments
      allow.owner().to(['update', 'delete']),
      // Moderators can approve/disapprove comments
      allow.groups(['Moderators', 'Admins']).to(['read', 'update']),
      // Admins have full access
      allow.groups(['Admins']).to(['create', 'read', 'update', 'delete']),
    ]),

  // Basic Todo for simple examples
  Todo: a
    .model({
      content: a.string(),
      isComplete: a.boolean().default(false),
      priority: a.enum(['LOW', 'MEDIUM', 'HIGH']),
      dueDate: a.date(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.authenticated().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
