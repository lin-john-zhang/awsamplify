# 🚀 Amplify Hosting Deployment Checklist

Use this checklist to deploy your Amplify Gen 2 app to production using AWS Amplify Hosting.

## ✅ Pre-Deployment Checklist

### 1. Local Development Ready
- [ ] App runs locally: `npm run dev`
- [ ] Build works: `npm run build`
- [ ] Backend deployed to sandbox: `npm run deploy:sandbox`
- [ ] All permission patterns tested

### 2. Git Repository Setup
- [ ] Code committed to Git repository
- [ ] Repository pushed to GitHub/GitLab/Bitbucket
- [ ] `amplify.yml` file is in the root directory
- [ ] `.gitignore` properly configured

### 3. AWS Configuration
- [ ] AWS account with sufficient permissions
- [ ] AWS CLI configured
- [ ] Amplify Gen 2 CLI installed (`npx ampx --version`)

## 📋 Deployment Steps

### Step 1: Verify amplify.yml
```bash
# Check that amplify.yml exists and is valid
cat amplify.yml

# Test local build
npm run build:amplify
```

### Step 2: Push to Repository
```bash
git add .
git commit -m "Add amplify.yml and deployment configuration"
git push origin main
```

### Step 3: Create Amplify App
1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Click "New app"** → **"Host web app"**
3. **Select your Git provider** (GitHub, GitLab, Bitbucket, etc.)
4. **Authorize AWS Amplify** to access your repositories
5. **Select your repository** and branch (usually `main`)

### Step 4: Configure Build Settings
1. **App name**: `aws-amplify-permissions-demo`
2. **Environment name**: `production` (or `staging`, `development`)
3. **Build settings**: Should auto-detect `amplify.yml`
4. **Service role**: Create new role or use existing
   - Role needs permissions for CloudFormation, S3, DynamoDB, Cognito

### Step 5: Environment Variables (Optional)
Add any required environment variables:
- `NODE_ENV`: `production`
- `NEXT_PUBLIC_APP_ENV`: `production`
- Custom variables for your app

### Step 6: Review and Deploy
1. **Review all settings**
2. **Click "Save and deploy"**
3. **Monitor the build process**

## 🔍 Monitoring Deployment

### Build Process Overview
1. **Provision**: AWS sets up build environment
2. **Build Backend**: Deploys Amplify Gen 2 resources
3. **Build Frontend**: Runs Next.js build
4. **Deploy**: Publishes to CDN
5. **Verify**: Health checks

### Expected Build Time
- **Backend**: 5-15 minutes (first deployment)
- **Frontend**: 2-5 minutes
- **Total**: 10-20 minutes for first deployment

### Build Logs to Watch
```
Backend Phase:
✓ npm ci --cache .npm --prefer-offline
✓ npx ampx pipeline-deploy --branch main --app-id XXXXXX

Frontend Phase:
✓ npm ci --cache .npm --prefer-offline
✓ npm run build
✓ Build completed successfully
```

## 🎯 Post-Deployment Verification

### 1. Check Deployed App
- [ ] Visit the Amplify-provided URL
- [ ] Test authentication flows
- [ ] Test storage permissions
- [ ] Test database permissions
- [ ] Verify all demo components work

### 2. Verify AWS Resources
```bash
# Check CloudFormation stacks
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `amplify`)].{Name:StackName,Status:StackStatus}'

# Check Cognito User Pool
aws cognito-idp list-user-pools --max-items 10

# Check S3 buckets
aws s3 ls | grep amplify

# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `amplify`)]'
```

### 3. Test Environment Variables
Your deployed app should have access to:
- Generated `amplify_outputs.json` configuration
- All backend resources (Auth, Storage, Data)
- Proper CORS configuration

## 🔧 Troubleshooting Common Issues

### Build Fails: Backend Deployment
**Error**: CloudFormation deployment failed
**Solution**:
1. Check service role permissions
2. Verify AWS account limits
3. Check for resource naming conflicts

```yaml
# Add debug logging to amplify.yml
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --debug
```

### Build Fails: Frontend Build
**Error**: Next.js build failed
**Solution**:
1. Test build locally: `npm run build`
2. Check for TypeScript errors
3. Verify all dependencies are in package.json

### Build Fails: Permission Issues
**Error**: Access denied
**Solution**:
1. Update Amplify service role permissions
2. Add required policies:
   - CloudFormationFullAccess
   - IAMFullAccess
   - S3FullAccess
   - DynamoDBFullAccess
   - CognitoIdpFullAccess

### App Loads but Backend Not Working
**Error**: API calls fail, auth doesn't work
**Solution**:
1. Check if `amplify_outputs.json` is generated
2. Verify environment variables
3. Check CORS configuration
4. Verify backend resources deployed correctly

## 🔄 Continuous Deployment

### Automatic Deployments
Once set up, Amplify will automatically:
- Deploy on every push to connected branch
- Update both backend and frontend
- Run build process defined in `amplify.yml`

### Branch-based Deployments
Set up multiple environments:
- `main` branch → Production
- `staging` branch → Staging
- `develop` branch → Development

### Manual Deployments
You can also trigger manual deployments:
1. Go to Amplify Console
2. Select your app
3. Click "Redeploy this version"

## 🔒 Security Considerations

### 1. Service Role Permissions
Ensure the Amplify service role has minimum required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:*",
        "s3:*",
        "dynamodb:*",
        "cognito-idp:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Environment Variables
- Never commit secrets to Git
- Use Amplify Console environment variables
- Use AWS Secrets Manager for sensitive data

### 3. Access Control
- Set up proper Cognito user groups
- Configure S3 bucket policies correctly
- Use DynamoDB fine-grained access control

## 💰 Cost Monitoring

### Amplify Hosting Costs
- Build minutes: $0.01 per minute
- Storage: $0.023 per GB per month
- Data transfer: $0.15 per GB

### Backend Resource Costs
- Cognito: Free tier 50,000 MAUs
- DynamoDB: Free tier 25 GB + 25 RCU/WCU
- S3: Free tier 5 GB storage
- Lambda: Free tier 1M requests

### Cost Optimization
- Use Amplify's free tier
- Monitor AWS billing dashboard
- Set up billing alerts
- Clean up unused resources

## 🎉 Success Metrics

After successful deployment:
- ✅ App accessible via Amplify URL
- ✅ All permission patterns working
- ✅ Authentication flows functional
- ✅ Storage upload/download working
- ✅ Database operations working
- ✅ No console errors
- ✅ Fast load times (<3 seconds)

## 📞 Support Resources

- **AWS Amplify Documentation**: https://docs.amplify.aws/
- **AWS Amplify Discord**: https://discord.gg/amplify
- **AWS Support**: Create support case in AWS Console
- **Community Forums**: https://github.com/aws-amplify/amplify-hosting/discussions

---

**🚀 Ready to deploy? Start with Step 1 and follow the checklist!**
