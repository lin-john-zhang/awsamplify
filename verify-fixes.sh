#!/bin/bash

# Quick verification script for TypeScript fixes and deployment readiness

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

echo "🔍 Post-Fix Verification"
echo "======================="
echo ""

# Check TypeScript compilation
print_status "1. Checking TypeScript compilation..."
if cd amplify && npx tsc --noEmit && cd ..; then
    print_success "✅ No TypeScript errors found!"
else
    print_error "❌ TypeScript errors still exist"
    exit 1
fi

# Check AWS credentials
print_status "2. Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "not-set")
    print_success "✅ AWS credentials valid (Account: $AWS_ACCOUNT, Region: $AWS_REGION)"
else
    print_error "❌ AWS credentials invalid or expired"
    echo "Run: aws sso login or aws configure"
    exit 1
fi

# Check CDK bootstrap status
print_status "3. Checking CDK bootstrap status..."
if aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    print_success "✅ CDK is bootstrapped in region $AWS_REGION"
    DEPLOYMENT_READY=true
else
    print_warning "⚠️  CDK is not bootstrapped in region $AWS_REGION"
    echo "  Run: npm run amplify:bootstrap"
    echo "  Or use Amplify Console for deployment"
    DEPLOYMENT_READY=false
fi

# Check dependencies
print_status "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_success "✅ Dependencies installed"
    DEPLOYMENT_READY=true
else
    print_warning "⚠️  Dependencies missing. Run: npm install"
    DEPLOYMENT_READY=false
fi

echo ""
echo "📋 Summary:"
echo "==========="

if [ "$DEPLOYMENT_READY" = true ]; then
    print_success "🎉 Everything looks good! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "  Local development: npm run deploy:sandbox"
    echo "  One-time deploy:   npm run deploy:once" 
    echo "  Full deploy:       ./deploy.sh"
    echo "  Check status:      npm run status"
else
    print_warning "🔧 Some issues need to be resolved before deployment:"
    echo ""
    echo "To fix:"
    if aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
        echo "  ✅ CDK is ready"
    else
        echo "  🔧 Bootstrap CDK: npm run amplify:bootstrap"
    fi
    
    if [ -d "node_modules" ]; then
        echo "  ✅ Dependencies ready"
    else
        echo "  🔧 Install dependencies: npm install"
    fi
    
    echo ""
    echo "Or use Amplify Console for deployment (no bootstrap required)"
fi

echo ""
print_status "🔗 Helpful links:"
echo "  TypeScript fixes: cat TYPESCRIPT-FIXES.md"
echo "  Deployment guide: cat DEPLOYMENT-GUIDE.md"
echo "  Status check:     npm run status"

echo ""
print_success "Verification complete!"
