# 🚀 AWS Amplify Gen 2 CLI Deployment - Complete Guide

Your AWS Amplify Gen 2 backend is now ready for deployment! This guide provides multiple ways to deploy your backend with comprehensive permission patterns.

## 📋 Prerequisites Checklist

- ✅ AWS CLI v2.24.2 installed
- ✅ Node.js and npm installed  
- ✅ Amplify Gen 2 CLI (ampx) v1.8.0 installed
- 🔄 Valid AWS credentials (refresh if expired)

## 🎯 Quick Deployment (Recommended)

### Option 1: Automated Setup Script
```bash
./setup-aws.sh
```
This script will:
- Check AWS credentials and help refresh if needed
- Automatically start the deployment process
- Handle common issues and provide guidance

### Option 2: Manual Deployment
```bash
# 1. Refresh AWS credentials (if expired)
aws sso login  # or aws configure

# 2. Deploy backend
npx ampx sandbox

# 3. Start frontend (in another terminal)
npm run dev
```

### Option 3: One-time Deployment (No File Watching)
```bash
npx ampx sandbox --once
```

## 📊 Monitor Your Deployment

### Check Status
```bash
./check-status.sh
# or
npm run status
```

### View Deployment Info
```bash
npx ampx info
```

### Stream Function Logs
```bash
npx ampx sandbox --stream-function-logs
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Run deployment script |
| `npm run deploy:sandbox` | Start sandbox (watch mode) |
| `npm run deploy:once` | Deploy once without watching |
| `npm run deploy:delete` | Delete sandbox resources |
| `npm run setup-aws` | Setup/refresh AWS credentials |
| `npm run status` | Check deployment status |
| `npm run amplify:info` | Get Amplify deployment info |

## 🎪 What Gets Deployed

### 🔐 Authentication (AWS Cognito)
- **User Pool** with custom attributes (department, role)
- **User Groups**: Admins, Moderators, Users
- **MFA Configuration** with SMS and TOTP
- **Custom Attributes**: department, role, etc.

### 🗄️ Storage (Amazon S3)
- **Public Access**: Everyone can read
- **Protected Access**: Authenticated users can read, owners can write
- **Private Access**: Only owners can read/write
- **Group-based Access**: Admin, department-level access
- **CORS Configuration** for web app integration

### 📊 Database (Amazon DynamoDB)
Multiple tables demonstrating different permission patterns:

| Table | Access Pattern | Description |
|-------|---------------|-------------|
| `UserProfile` | Owner-based | Users can only access their own profiles |
| `PublicPost` | Public read, auth write | Anyone can read, authenticated users can write |
| `CompanyData` | Group-based | Access based on user groups (Admin, Moderator) |
| `AdminSettings` | Admin-only | Only admin group can access |
| `ProjectTask` | Attribute-based | Access based on department/project attributes |

## 🧪 Testing Your Deployment

### 1. Frontend Demo
```bash
npm run dev
# Visit: http://localhost:3000
```

The demo includes:
- **Storage Demo**: Upload/download files with different permissions
- **Database Demo**: Create/read records with various access patterns
- **Auth Demo**: Sign up, sign in, group management

### 2. Manual Testing
Use the AWS Console to verify:
- Cognito User Pool and groups
- S3 bucket and objects
- DynamoDB tables and data
- CloudFormation stacks

## 🔍 Troubleshooting

### Common Issues

#### Issue: Expired AWS Credentials
```
Error: ExpiredTokenException
```
**Solution**: Run `./setup-aws.sh` or manually refresh with `aws sso login`

#### Issue: Insufficient Permissions
```
Error: AccessDenied for CloudFormation
```
**Solution**: Ensure your AWS user has permissions for:
- CloudFormation (create/update/delete stacks)
- S3 (create buckets, manage objects)
- DynamoDB (create tables, manage items)
- Cognito (manage user pools)
- IAM (create roles, policies)

#### Issue: Resource Already Exists
```
Error: Bucket already exists
```
**Solution**: Use a unique identifier or delete existing resources:
```bash
npx ampx sandbox delete
```

#### Issue: Build Failures
Check the logs:
```bash
npx ampx sandbox --stream-function-logs
```

### Debug Commands
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Amplify CLI version
npx ampx --version

# Get detailed deployment info
npx ampx info

# View all created resources
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `amplify`)].{Name:StackName,Status:StackStatus}'
```

## 💰 Cost Management

### Free Tier Resources
- **Cognito**: 50,000 MAUs free
- **DynamoDB**: 25 GB storage + 25 RCU/WCU free
- **S3**: 5 GB storage + 20,000 GET requests free
- **Lambda**: 1M requests + 400,000 GB-seconds free

### Cleanup Resources
```bash
# Delete all sandbox resources
npx ampx sandbox delete

# Or use npm script
npm run deploy:delete
```

## 🚀 Production Deployment

For production environments:

### 1. Set up Amplify App
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Create new app
3. Connect your Git repository
4. Configure build settings

### 2. Environment Configuration
```bash
# Configure production profile
npx ampx configure profile

# Deploy to production branch
npx ampx pipeline-deploy --branch main
```

### 3. Environment Variables
Set up environment-specific configurations in the Amplify Console.

## 📚 Next Steps

After successful deployment:

1. **✅ Test All Permission Patterns** - Use the demo components
2. **📊 Monitor AWS Costs** - Check billing dashboard
3. **🔒 Security Review** - Validate all access controls
4. **🔄 CI/CD Setup** - Automate deployments
5. **📖 Documentation** - Update team documentation

## 🆘 Support Resources

- 📖 [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- 💬 [AWS Amplify Discord](https://discord.gg/amplify)
- 🐛 [GitHub Issues](https://github.com/aws-amplify/amplify-backend/issues)
- 📺 [AWS Amplify YouTube](https://www.youtube.com/c/AWSAmplify)

## 📄 Files Created for Deployment

- `DEPLOYMENT-GUIDE.md` - Comprehensive deployment documentation
- `deploy.sh` - Interactive deployment script
- `setup-aws.sh` - AWS credential setup helper
- `check-status.sh` - Deployment status checker
- Updated `package.json` with deployment scripts

---

**🎉 Your Amplify Gen 2 backend is ready to deploy!**

Start with: `./setup-aws.sh` for the smoothest experience.
