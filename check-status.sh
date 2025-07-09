#!/bin/bash

# Deployment Status Checker
# Checks the status of your Amplify deployment and provides helpful information

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

echo "📊 Amplify Deployment Status Check"
echo "================================="
echo ""

# Check if amplify_outputs.json exists
if [ -f "amplify_outputs.json" ]; then
    print_success "✅ amplify_outputs.json found - Backend is deployed"
    
    # Extract some basic info from the config
    if command -v jq &> /dev/null; then
        echo ""
        print_status "Backend Configuration:"
        
        if jq -e '.auth' amplify_outputs.json > /dev/null 2>&1; then
            USER_POOL_ID=$(jq -r '.auth.user_pool_id' amplify_outputs.json 2>/dev/null || echo "not found")
            print_success "  🔐 Auth: User Pool ID: $USER_POOL_ID"
        fi
        
        if jq -e '.storage' amplify_outputs.json > /dev/null 2>&1; then
            BUCKET_NAME=$(jq -r '.storage.bucket_name' amplify_outputs.json 2>/dev/null || echo "not found")
            print_success "  🗄️  Storage: Bucket: $BUCKET_NAME"
        fi
        
        if jq -e '.data' amplify_outputs.json > /dev/null 2>&1; then
            API_ENDPOINT=$(jq -r '.data.url' amplify_outputs.json 2>/dev/null || echo "not found")
            print_success "  📊 Data: GraphQL Endpoint configured"
        fi
    else
        print_warning "Install 'jq' for detailed configuration analysis"
    fi
    
    echo ""
    print_status "Next steps:"
    echo "1. Start your app: npm run dev"
    echo "2. Visit: http://localhost:3000"
    echo "3. Test permission patterns in the demo"
    
else
    print_warning "❌ amplify_outputs.json not found - Backend not deployed"
    echo ""
    print_status "To deploy your backend:"
    echo "1. Run: ./setup-aws.sh (recommended)"
    echo "2. Or: ./deploy.sh"
    echo "3. Or: npx ampx sandbox"
fi

echo ""

# Check AWS credentials
print_status "Checking AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "not-set")
    print_success "✅ AWS credentials valid (Account: $AWS_ACCOUNT, Region: $AWS_REGION)"
else
    print_error "❌ AWS credentials invalid or expired"
    echo "  Run: ./setup-aws.sh to fix credentials"
fi

# Check if sandbox is running
print_status "Checking for active sandbox..."
if pgrep -f "ampx sandbox" > /dev/null; then
    print_success "✅ Sandbox is currently running"
    echo "  Watching for file changes and auto-deploying"
    echo "  Press Ctrl+C in the sandbox terminal to stop"
else
    print_status "No active sandbox found"
    echo "  Start with: npx ampx sandbox"
fi

# Check frontend dependencies
print_status "Checking frontend dependencies..."
if [ -d "node_modules" ]; then
    print_success "✅ Frontend dependencies installed"
else
    print_warning "❌ Frontend dependencies not installed"
    echo "  Run: npm install"
fi

# Check if Next.js app is running
if pgrep -f "next dev" > /dev/null; then
    print_success "✅ Next.js development server is running"
    echo "  Visit: http://localhost:3000"
elif [ -f "amplify_outputs.json" ]; then
    print_status "💡 Ready to start frontend: npm run dev"
fi

echo ""

# Provide cleanup information
print_status "Cleanup commands:"
echo "  Delete sandbox: npx ampx sandbox delete"
echo "  Clean node_modules: rm -rf node_modules && npm install"
echo "  Reset deployment: rm amplify_outputs.json"

echo ""
print_status "Useful commands:"
echo "  Check deployment info: npx ampx info"
echo "  View sandbox logs: npx ampx sandbox --stream-function-logs"
echo "  Deploy once (no watching): npx ampx sandbox --once"

echo ""
print_success "Status check complete!"
