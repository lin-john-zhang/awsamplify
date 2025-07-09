#!/bin/bash

# Quick AWS credentials check and refresh script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🔐 AWS Credentials Check & Refresh"
echo "=================================="
echo ""

# Check current credentials
print_status "Checking current AWS credentials..."

if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "not-set")
    AWS_USER=$(aws sts get-caller-identity --query 'Arn' --output text)
    
    print_success "✅ AWS credentials are valid!"
    echo "  Account: $AWS_ACCOUNT"
    echo "  Region: $AWS_REGION"
    echo "  User: $AWS_USER"
    echo ""
    
    read -p "Credentials are valid. Continue with deployment? (Y/n): " continue_deploy
    if [[ $continue_deploy =~ ^[Nn]$ ]]; then
        print_status "Stopping here. Run ./deploy.sh when ready to deploy."
        exit 0
    else
        print_status "Starting deployment..."
        ./deploy.sh
        exit $?
    fi
else
    print_error "❌ AWS credentials are invalid or expired"
    echo ""
    
    # Check what type of credentials to use
    echo "How do you want to authenticate with AWS?"
    echo "1) AWS SSO (IAM Identity Center)"
    echo "2) IAM User (Access Key/Secret Key)"
    echo "3) Manual setup (I'll configure myself)"
    echo ""
    read -p "Choose option (1-3): " auth_choice
    
    case $auth_choice in
        1)
            print_status "Setting up AWS SSO authentication..."
            echo ""
            echo "If this is your first time:"
            echo "1. Run: aws configure sso"
            echo "2. Follow the prompts to set up your SSO profile"
            echo "3. Then run this script again"
            echo ""
            read -p "Already configured SSO? Login now? (y/N): " do_sso_login
            if [[ $do_sso_login =~ ^[Yy]$ ]]; then
                print_status "Logging in with SSO..."
                aws sso login
                
                # Verify login worked
                if aws sts get-caller-identity &> /dev/null; then
                    print_success "✅ SSO login successful!"
                    ./deploy.sh
                else
                    print_error "SSO login failed. Please try again."
                    exit 1
                fi
            else
                print_status "Please configure SSO first, then run this script again."
                exit 0
            fi
            ;;
        2)
            print_status "Setting up IAM User credentials..."
            echo ""
            print_warning "You'll need your Access Key ID and Secret Access Key"
            echo ""
            aws configure
            
            # Verify credentials worked
            if aws sts get-caller-identity &> /dev/null; then
                print_success "✅ IAM User credentials configured successfully!"
                ./deploy.sh
            else
                print_error "Credential configuration failed. Please try again."
                exit 1
            fi
            ;;
        3)
            print_status "Manual setup selected"
            echo ""
            echo "Please configure your AWS credentials manually:"
            echo "  - For SSO: aws configure sso && aws sso login"
            echo "  - For IAM User: aws configure"
            echo "  - For temporary credentials: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN"
            echo ""
            echo "Then run ./deploy.sh when ready."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
fi
