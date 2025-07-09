#!/bin/bash

# Test amplify.yml Configuration
# This script validates your amplify.yml setup before deployment

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

echo "🧪 Testing amplify.yml Configuration"
echo "==================================="
echo ""

# Check if amplify.yml exists
if [ -f "amplify.yml" ]; then
    print_success "✅ amplify.yml file found"
else
    print_error "❌ amplify.yml file not found"
    echo "Run this script from the project root directory"
    exit 1
fi

# Check if it's valid YAML
print_status "Validating YAML syntax..."
if command -v python3 &> /dev/null; then
    python3 -c "import yaml; yaml.safe_load(open('amplify.yml'))" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "✅ YAML syntax is valid"
    else
        print_error "❌ Invalid YAML syntax in amplify.yml"
        exit 1
    fi
else
    print_warning "Python3 not found, skipping YAML validation"
fi

# Test frontend build
print_status "Testing frontend build process..."
if [ -f "package.json" ]; then
    if npm run build &>/dev/null; then
        print_success "✅ Frontend build successful"
    else
        print_error "❌ Frontend build failed"
        echo "Run 'npm run build' to see detailed error messages"
        exit 1
    fi
else
    print_error "❌ package.json not found"
    exit 1
fi

# Check if build artifacts exist
if [ -d ".next" ]; then
    print_success "✅ Build artifacts (.next directory) created"
    
    # Check build size
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    print_status "Build size: $BUILD_SIZE"
else
    print_error "❌ Build artifacts not found"
    exit 1
fi

# Check required dependencies
print_status "Checking required dependencies..."

REQUIRED_DEPS=(
    "@aws-amplify/backend"
    "@aws-amplify/backend-cli"
    "aws-amplify"
    "next"
    "react"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if npm list "$dep" &>/dev/null; then
        print_success "✅ $dep installed"
    else
        print_error "❌ $dep not found"
        echo "Run 'npm install' to install missing dependencies"
        exit 1
    fi
done

# Check Amplify backend structure
print_status "Checking Amplify backend structure..."

if [ -f "amplify/backend.ts" ]; then
    print_success "✅ amplify/backend.ts found"
else
    print_error "❌ amplify/backend.ts not found"
    exit 1
fi

if [ -f "amplify/package.json" ]; then
    print_success "✅ amplify/package.json found"
else
    print_warning "⚠️  amplify/package.json not found (may be auto-generated)"
fi

# Check for environment variables usage
print_status "Checking for environment variables in amplify.yml..."
if grep -q "AWS_BRANCH\|AWS_APP_ID" amplify.yml; then
    print_success "✅ AWS environment variables properly referenced"
else
    print_warning "⚠️  No AWS environment variables found in amplify.yml"
fi

# Display amplify.yml content
echo ""
print_status "amplify.yml content:"
echo "---"
cat amplify.yml
echo "---"

# Check Git status
echo ""
print_status "Checking Git status..."
if git status &>/dev/null; then
    if git status --porcelain | grep -q "amplify.yml"; then
        print_warning "⚠️  amplify.yml has uncommitted changes"
        echo "Commit changes before deploying to Amplify Console"
    else
        print_success "✅ amplify.yml is committed to Git"
    fi
else
    print_warning "⚠️  Not a Git repository or Git not available"
fi

# Final recommendations
echo ""
print_status "Pre-deployment recommendations:"
echo "1. Test locally: npm run dev"
echo "2. Commit all changes: git add . && git commit -m 'Add amplify.yml'"
echo "3. Push to repository: git push origin main"
echo "4. Create Amplify app in AWS Console"
echo "5. Connect your Git repository"
echo ""

print_success "🎉 amplify.yml configuration test completed!"
echo ""
echo "Next steps:"
echo "• Follow DEPLOYMENT-CHECKLIST.md for complete deployment guide"
echo "• Visit AWS Amplify Console to set up hosting"
echo "• Monitor build logs during first deployment"
