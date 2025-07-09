# AWS Amplify.yml Configuration Guide

This guide explains how to set up `amplify.yml` for deploying your Amplify Gen 2 application with proper backend and frontend build configurations.

## 📄 Basic amplify.yml (Already Created)

The `amplify.yml` file in your project root defines how AWS Amplify builds and deploys your application.

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

## 🔧 Configuration Breakdown

### Backend Phase
- **`npm ci`**: Installs exact dependencies from package-lock.json
- **`npx ampx pipeline-deploy`**: Deploys Amplify Gen 2 backend resources
- **Environment Variables**: `$AWS_BRANCH` and `$AWS_APP_ID` are automatically provided

### Frontend Phase
- **`preBuild`**: Install dependencies
- **`build`**: Run Next.js build process
- **`artifacts`**: Specify build output directory (`.next` for Next.js)
- **`cache`**: Cache dependencies and build artifacts for faster builds

## 🎛️ Alternative Configurations

### 1. With Environment Variables
```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - echo "Deploying backend for branch $AWS_BRANCH"
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - echo "Node version $(node --version)"
        - echo "NPM version $(npm --version)"
    build:
      commands:
        - echo "Starting frontend build..."
        - npm run build
        - echo "Build completed successfully"
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

### 2. With TypeScript Build
```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - cd amplify && npm ci --cache .npm --prefer-offline && cd ..
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npm run lint
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
      - amplify/node_modules/**/*
```

### 3. With Testing
```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run lint
        - npm run test:ci
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

### 4. With Multiple Environments
```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - |
          if [ "$AWS_BRANCH" = "main" ]; then
            echo "Deploying to production"
          elif [ "$AWS_BRANCH" = "staging" ]; then
            echo "Deploying to staging"
          else
            echo "Deploying to development"
          fi
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - |
          if [ "$AWS_BRANCH" = "main" ]; then
            echo "NEXT_PUBLIC_ENV=production" >> .env.production
          elif [ "$AWS_BRANCH" = "staging" ]; then
            echo "NEXT_PUBLIC_ENV=staging" >> .env.staging
          fi
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

## 🚀 Setting Up Amplify Hosting

### Step 1: Push to Git Repository
```bash
git add .
git commit -m "Add amplify.yml configuration"
git push origin main
```

### Step 2: Create Amplify App in Console
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your Git repository (GitHub, GitLab, Bitbucket, etc.)
4. Select your repository and branch

### Step 3: Configure Build Settings
The Amplify Console will automatically detect your `amplify.yml` file. You can:
- Use the detected configuration
- Edit build settings in the console
- Override specific phases if needed

### Step 4: Set Environment Variables (if needed)
In the Amplify Console, you can set:
- `NODE_ENV`: production, staging, development
- Custom environment variables for your app
- Secrets and sensitive data

### Step 5: Deploy
- Amplify will automatically build and deploy your app
- Both backend and frontend will be deployed together
- You'll get a live URL for your application

## 🎯 Using npm Scripts for Amplify

Update your `package.json` to include Amplify-specific scripts:

```json
{
  "scripts": {
    "build": "next build",
    "build:amplify": "npm run build",
    "test:ci": "npm run lint",
    "deploy:pipeline": "npx ampx pipeline-deploy"
  }
}
```

## 🔍 Troubleshooting Common Issues

### Issue 1: Backend Deployment Fails
```yaml
# Add more verbose logging
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --debug
```

### Issue 2: Build Takes Too Long
```yaml
# Optimize caching
cache:
  paths:
    - .next/cache/**/*
    - .npm/**/*
    - node_modules/**/*
    - amplify/node_modules/**/*
    - amplify/.amplify/**/*
```

### Issue 3: Environment-Specific Issues
```yaml
# Add environment detection
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - echo "Building for branch: $AWS_BRANCH"
        - echo "App ID: $AWS_APP_ID"
        - env | grep AWS
```

## 📊 Monitoring and Logs

### Build Logs
- Available in Amplify Console
- Shows both backend and frontend build process
- Helpful for debugging deployment issues

### Performance Optimization
```yaml
# Add build performance monitoring
frontend:
  phases:
    build:
      commands:
        - echo "Build started at $(date)"
        - npm run build
        - echo "Build completed at $(date)"
        - du -sh .next
```

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit secrets to `amplify.yml`
- Use Amplify Console environment variables
- Use AWS Secrets Manager for sensitive data

### 2. Build Process
```yaml
# Add security checks
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npm audit --audit-level=high
    build:
      commands:
        - npm run build
```

## 🔄 Branch-Specific Deployments

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - |
          case $AWS_BRANCH in
            main)
              echo "Deploying to production environment"
              ;;
            staging)
              echo "Deploying to staging environment"
              ;;
            *)
              echo "Deploying to development environment"
              ;;
          esac
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

## 🎉 Next Steps After Setup

1. **Test Local Build**: `npm run build` to ensure everything works
2. **Commit and Push**: Push `amplify.yml` to your repository
3. **Create Amplify App**: Set up hosting in AWS Console
4. **Configure Domain**: Add custom domain if needed
5. **Set up Monitoring**: Enable CloudWatch logs and monitoring

Your `amplify.yml` is now configured for seamless deployment of your Amplify Gen 2 application with all permission patterns!
