# AWS Amplify Gen 2 Backend Permissions Demo

This project demonstrates comprehensive AWS Amplify Gen 2 backend permission patterns for Storage (S3), Database (DynamoDB), and Authentication (Cognito) with a practical, code-first approach.

## 🚀 Quick Start

### Prerequisites
- AWS CLI v2 installed and configured
- Node.js 18+ and npm
- Valid AWS credentials

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd awsamplify
npm install
```

### 2. Deploy Backend
Choose your preferred method:

**Option A: Automated Setup (Recommended)**
```bash
./setup-aws.sh
```
This script will:
- Check your AWS credentials
- Help you refresh them if expired
- Automatically start the deployment

**Option B: Manual Setup**
```bash
# Refresh AWS credentials if needed
aws sso login  # or aws configure

# Start deployment
./deploy.sh
```

**Option C: Direct Deployment**
```bash
npx ampx sandbox
```

### 3. Start Frontend
Once backend is deployed:
```bash
npm run dev
```

Visit `http://localhost:3000` to explore the permission patterns!

## 📁 Project Structure

```
amplify/                    # Amplify Gen 2 backend
├── auth/resource.ts       # Cognito configuration with groups
├── storage/resource.ts    # S3 with fine-grained access
├── data/resource.ts       # DynamoDB with various patterns
└── backend.ts             # Main backend configuration

src/components/            # React demo components
├── StoragePermissionsDemo.js    # S3 permission testing
└── DatabasePermissionsDemo.js   # DynamoDB permission testing

docs/permissions/          # Comprehensive documentation
├── auth-permissions.md
├── storage-permissions.md
├── api-permissions.md
├── function-permissions.md
└── troubleshooting.md

DEPLOYMENT-GUIDE.md       # Detailed deployment guide
```

## Permission Types Covered

### 1. Authentication & Authorization

- **Cognito User Pools**: User registration, login, and group-based permissions
- **Identity Pools**: Federated identities and temporary AWS credentials
- **Multi-Factor Authentication (MFA)**: Enhanced security setup
- **Custom Attributes**: User profile permissions

### 2. API Permissions

- **GraphQL API**: Field-level authorization with multiple auth modes
- **REST API**: Resource-based access control
- **API Gateway**: Custom authorizers and IAM policies

### 3. Storage Permissions

- **S3 Bucket Access**: Public, protected, and private file access
- **Fine-grained Permissions**: Path-based access control
- **CORS Configuration**: Cross-origin resource sharing

### 4. Function Permissions

- **Lambda Execution Roles**: IAM policies for function execution
- **VPC Access**: Network-level security
- **Environment Variables**: Secure configuration management

## Key Permission Concepts

### Authorization Strategies

1. **API Key**: Simple, non-authenticated access
2. **Amazon Cognito User Pools**: Authenticated users
3. **AWS IAM**: Service-to-service authentication
4. **OpenID Connect**: Third-party identity providers
5. **AWS Lambda**: Custom authorization logic

### Access Patterns

- **Owner-based**: Users can only access their own data
- **Group-based**: Access based on Cognito user groups
- **Role-based**: IAM role-based permissions
- **Dynamic**: Runtime permission evaluation

## Permission Examples

This project includes practical examples of:

- User registration and login flows
- Protected routes and components
- File upload with access controls
- API calls with different auth modes
- Admin panels with elevated permissions
- Multi-tenant data isolation

## Security Best Practices

1. **Principle of Least Privilege**: Grant minimal required permissions
2. **Defense in Depth**: Multiple layers of security
3. **Regular Audits**: Review and update permissions regularly
4. **Encryption**: Data encryption at rest and in transit
5. **Monitoring**: CloudWatch logs and CloudTrail for audit trails

## Common Permission Patterns

### User Data Isolation

```graphql
type Post @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  title: String!
  content: String!
  owner: String
}
```

### Group-based Access

```graphql
type AdminData @model @auth(rules: [{ allow: groups, groups: ["Admins"] }]) {
  id: ID!
  sensitiveInfo: String!
}
```

### Mixed Authorization

```graphql
type Article
  @model
  @auth(
    rules: [
      { allow: owner, operations: [create, update, delete] }
      { allow: public, operations: [read] }
    ]
  ) {
  id: ID!
  title: String!
  content: String!
}
```

## Troubleshooting Permissions

Common issues and solutions:

- Access denied errors
- CORS configuration problems
- IAM role misconfigurations
- Cognito user pool setup issues

## Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [GraphQL Authorization](https://docs.amplify.aws/cli/graphql/authorization-rules/)
- [Authentication Guide](https://docs.amplify.aws/lib/auth/getting-started/)
- [Storage Access Control](https://docs.amplify.aws/lib/storage/configureaccess/)

## 📱 Using the Demo

### Demo Features

#### 🗂️ Storage Permissions Tab

- **File Upload**: Test different access levels (public, protected, private, admin, department)
- **File Management**: Download and delete files with permission checking
- **Access Control**: See how group membership affects file access
- **Real-time Feedback**: Upload progress and permission validation

#### 📊 Overview Tab

- **User Information**: Current user details, groups, and custom attributes
- **Permission Summary**: What actions are available to the current user
- **Technical Details**: Backend configuration and implementation notes

#### 📝 Posts & API Tab (In full AWS mode)

- **CRUD Operations**: Create, read, update, delete posts with authorization
- **Group-based Access**: Different permissions for Users, Moderators, Admins
- **Owner-based Security**: Users can only modify their own content

### Testing Different User Types

#### Demo Mode Users

Edit `src/demo-config.js` to test different user scenarios:

```javascript
// Admin user
'cognito:groups': ['Admins', 'Users']

// Moderator user
'cognito:groups': ['Moderators', 'Users']

// Regular user
'cognito:groups': ['Users']

// User with department access
'custom:department': 'Engineering' // or 'Marketing', 'Sales'
```

#### AWS Mode Users

In production, users are assigned to groups via:

- Cognito User Pool Groups
- Custom attributes set during signup
- Admin assignment through AWS Console

## 🔧 Technical Implementation

### Backend Architecture

```
/amplify/
├── backend.ts              # Main backend configuration
├── auth/resource.ts        # Cognito setup with groups
├── storage/resource.ts     # S3 bucket with fine-grained access
└── data/resource.ts        # GraphQL API with authorization
```

### Key Features Demonstrated

#### 1. S3 Storage Permissions

- **Public Access**: `s3:GetObject` for all users
- **Protected Access**: Read for all, write for owner only
- **Private Access**: Full access for owner only
- **Group-based**: Admin/Moderator/Department-specific folders
- **IAM Policies**: Dynamic permissions based on user attributes

#### 2. Authentication & Authorization

- **Cognito Groups**: Hierarchical permission system
- **Custom Attributes**: Department, role-based access
- **MFA Support**: Enhanced security for sensitive operations
- **Social Providers**: Google, Facebook integration ready

#### 3. API Security

- **Field-level Security**: GraphQL with fine-grained access control
- **Owner-based Rules**: Resources tied to user identity
- **Group Authorization**: Different access levels per group
- **Custom Business Logic**: Advanced permission patterns

## 🛠️ Customization

### Adding New Permission Patterns

#### 1. New Storage Access Level

Edit `amplify/storage/resource.ts`:

```typescript
// Add new access rules
access: {
  'department-hr/*': ['read', 'write'],
  'reports/confidential/*': ['read']
}
```

#### 2. New User Groups

Edit `amplify/auth/resource.ts`:

```typescript
groups: {
  'SuperAdmins': {
    precedence: 1
  },
  'Contractors': {
    precedence: 100
  }
}
```

#### 3. Custom Attributes

Add to user schema:

```typescript
schema: {
  custom: {
    'custom:clearanceLevel': 'String',
    'custom:projectAccess': 'String'
  }
}
```

### Environment Configuration

#### Development

```bash
# .env.local
NEXT_PUBLIC_AMPLIFY_ENV=development
NEXT_PUBLIC_LOG_LEVEL=debug
```

#### Production

```bash
# .env.production
NEXT_PUBLIC_AMPLIFY_ENV=production
NEXT_PUBLIC_LOG_LEVEL=error
```

## 📚 Documentation Structure

- `docs/permissions/auth-permissions.md` - Authentication patterns
- `docs/permissions/storage-permissions.md` - S3 access control
- `docs/permissions/api-permissions.md` - GraphQL security
- `docs/permissions/function-permissions.md` - Lambda authorization
- `docs/permissions/troubleshooting.md` - Common issues and solutions

## 🔍 Monitoring & Debugging

### CloudWatch Integration

- User activity logs
- Permission denied events
- Storage access patterns
- API usage metrics

### Local Debugging

```bash
# Enable debug logging
NEXT_PUBLIC_LOG_LEVEL=debug npm run dev

# Test specific permission
node scripts/test-permissions.js --user-id=test --group=Admins
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-permission-pattern`)
3. Commit your changes (`git commit -am 'Add new permission pattern'`)
4. Push to the branch (`git push origin feature/new-permission-pattern`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
