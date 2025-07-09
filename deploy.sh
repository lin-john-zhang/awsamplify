#!/bin/bash

# AWS Amplify Gen 2 Deployment Script
# This script automates the deployment process for your Amplify backend

set -e  # Exit on any error

echo "🚀 AWS Amplify Gen 2 Deployment Script"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "amplify/backend.ts" ]; then
    print_error "amplify/backend.ts not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI v2."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm."
    exit 1
fi

print_success "Prerequisites check completed"

# Check AWS credentials
print_status "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not valid or expired."
    echo ""
    echo "Please refresh your credentials:"
    echo "  For AWS SSO: aws sso login"
    echo "  For IAM User: aws configure"
    echo ""
    echo "Then run this script again."
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
print_success "AWS credentials valid. Account: $AWS_ACCOUNT, Region: $AWS_REGION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Check if amplify dependencies are installed
if [ ! -d "amplify/node_modules" ]; then
    print_status "Installing Amplify dependencies..."
    cd amplify && npm install && cd ..
    print_success "Amplify dependencies installed"
else
    print_status "Amplify dependencies already installed"
fi

# Ask user for deployment type
echo ""
echo "Please choose deployment type:"
echo "1) Development Sandbox (recommended for testing)"
echo "2) One-time deployment (no file watching)"
echo "3) Production deployment setup"
echo ""
read -p "Enter your choice (1-3): " deployment_choice

case $deployment_choice in
    1)
        print_status "Starting development sandbox..."
        echo ""
        print_warning "This will create real AWS resources in your account."
        print_warning "Remember to clean up with 'npx ampx sandbox delete' when done."
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_status "Deploying to sandbox..."
            echo ""
            echo "Deployment logs will appear below. Press Ctrl+C to stop watching."
            echo "Your amplify_outputs.json will be generated automatically."
            echo ""
            npx ampx sandbox
        else
            print_status "Deployment cancelled"
            exit 0
        fi
        ;;
    2)
        print_status "Starting one-time deployment..."
        echo ""
        print_warning "This will create real AWS resources in your account."
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_status "Deploying backend..."
            npx ampx sandbox --once
            print_success "Deployment completed"
            
            if [ -f "amplify_outputs.json" ]; then
                print_success "Configuration file generated: amplify_outputs.json"
            fi
            
            echo ""
            echo "Next steps:"
            echo "1. Start your Next.js app: npm run dev"
            echo "2. Test your permission patterns at http://localhost:3000"
            echo "3. Clean up resources when done: npx ampx sandbox delete"
        else
            print_status "Deployment cancelled"
            exit 0
        fi
        ;;
    3)
        print_status "Production deployment setup..."
        echo ""
        echo "For production deployment, you'll need to:"
        echo "1. Set up an Amplify app in the AWS Console"
        echo "2. Connect your Git repository"
        echo "3. Configure build settings"
        echo "4. Use: npx ampx pipeline-deploy --branch main"
        echo ""
        echo "See DEPLOYMENT-GUIDE.md for detailed instructions."
        ;;
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

print_success "Deployment script completed"
