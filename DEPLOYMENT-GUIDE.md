# AWS Amplify Gen 2 Deployment Guide

This guide provides step-by-step instructions for deploying your Amplify Gen 2 backend with permission patterns.

## Prerequisites

✅ AWS CLI v2 installed and configured  
✅ Node.js and npm installed  
✅ Amplify Gen 2 CLI (ampx) installed  
🔄 Valid AWS credentials (refresh if expired)  

## Deployment Options

### Option 1: Development Sandbox (Recommended for Testing)

The sandbox is perfect for development and testing your permission patterns.

#### Step 1: Refresh AWS Credentials

Choose the method that matches your AWS setup:

**If using AWS SSO/IAM Identity Center:**
```bash
aws sso login
```

**If using IAM User credentials:**
```bash
aws configure
```

**Verify credentials:**
```bash
aws sts get-caller-identity
```

#### Step 2: Start Sandbox Deployment

```bash
cd /Users/ljzhang/Documents/proj/GitHub/lin-john-zhang/awsamplify
npx ampx sandbox
```

This will:
- Deploy your backend resources (Auth, Storage, Data)
- Create real AWS resources in your account
- Watch for changes and auto-redeploy
- Generate `amplify_outputs.json` for frontend integration

#### Step 3: Monitor Deployment

The sandbox will show:
- CloudFormation deployment progress
- Resource creation status
- Any errors or warnings
- Generated endpoints and configuration

#### Step 4: Test Your Application

Once deployed, start your Next.js app:
```bash
npm run dev
```

Visit `http://localhost:3000` to test your permission patterns.

### Option 2: Production Deployment

For production environments, you'll want to use the pipeline deployment approach.

#### Step 1: Set up Amplify App (via Console)

1. Go to AWS Amplify Console
2. Create new app
3. Connect your repository
4. Configure build settings

#### Step 2: Configure Environment

Set up your production environment:
```bash
npx ampx configure profile
```

#### Step 3: Deploy via Pipeline

```bash
npx ampx pipeline-deploy --branch main
```

## Resource Overview

Your deployment will create:

### Authentication (Cognito)
- User Pool with custom attributes
- User Groups: Admins, Moderators, Users
- MFA configuration
- OAuth providers (if configured)

### Storage (S3)
- Bucket with fine-grained access controls
- Public, protected, private access levels
- Group-based access (admin, department, etc.)
- CORS configuration

### Database (DynamoDB)
- Multiple tables with different permission patterns:
  - `UserProfile` (owner-based access)
  - `PublicPost` (public read, authenticated write)
  - `CompanyData` (group-based access)
  - `AdminSettings` (admin-only access)
  - `ProjectTask` (attribute-based access)

### Generated Configuration

After deployment, you'll have:
- `amplify_outputs.json` - Frontend configuration
- CloudFormation stacks in AWS
- Real AWS resources you can inspect

## Testing Permission Patterns

### 1. Storage Permissions
- Upload files to different access levels
- Test group-based access
- Verify CORS settings

### 2. Database Permissions
- Create records with different ownership
- Test group-based queries
- Verify attribute-based access

### 3. Authentication
- Test user registration/login
- Verify group assignments
- Test MFA flows

## Troubleshooting

### Common Issues

#### Expired Credentials
```
Error: ExpiredTokenException
Solution: aws sso login or aws configure
```

#### Insufficient Permissions
```
Error: AccessDenied
Solution: Ensure your AWS user has sufficient permissions for CloudFormation, S3, DynamoDB, Cognito
```

#### Resource Conflicts
```
Error: Resource already exists
Solution: Use unique identifiers or delete existing resources
```

### Debug Commands

Check deployment status:
```bash
npx ampx info
```

View logs:
```bash
npx ampx sandbox --stream-function-logs
```

Delete sandbox (cleanup):
```bash
npx ampx sandbox delete
```

## Cost Considerations

### Sandbox Resources
- Cognito User Pool: Free tier available
- S3 Storage: Pay per use
- DynamoDB: Free tier available
- Lambda: Free tier available

### Cleanup
Always delete sandbox resources when done testing:
```bash
npx ampx sandbox delete
```

## Next Steps

After successful deployment:

1. **Test All Permission Patterns** - Use the demo components to verify each access control pattern
2. **Monitor Costs** - Check AWS billing dashboard
3. **Production Setup** - Configure proper environments for staging/production
4. **CI/CD Integration** - Set up automated deployments
5. **Security Review** - Validate all permission configurations

## Support Resources

- [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [AWS Amplify Discord](https://discord.gg/amplify)
- [GitHub Issues](https://github.com/aws-amplify/amplify-backend/issues)

---

**Remember**: The sandbox creates real AWS resources. Always clean up when done testing to avoid unnecessary costs.
