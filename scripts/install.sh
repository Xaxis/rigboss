#!/bin/bash

# RigBoss Cross-Platform Installer
# Supports: Linux (Ubuntu/Debian/Fedora/Arch), macOS, Windows (WSL)

set -e

RIGBOSS_VERSION="0.1.0"
RIGBOSS_REPO="https://github.com/your-username/rigboss.git"
INSTALL_DIR="$HOME/rigboss"
NODE_MIN_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get >/dev/null 2>&1; then
            OS="ubuntu"
        elif command -v dnf >/dev/null 2>&1; then
            OS="fedora"
        elif command -v pacman >/dev/null 2>&1; then
            OS="arch"
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    log_info "Detected OS: $OS"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js if needed
install_nodejs() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
            log_success "Node.js $NODE_VERSION is already installed"
            return
        fi
    fi

    log_info "Installing Node.js..."
    case $OS in
        ubuntu)
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        fedora)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo dnf install -y nodejs npm
            ;;
        arch)
            sudo pacman -S --noconfirm nodejs npm
            ;;
        macos)
            if command_exists brew; then
                brew install node
            else
                log_error "Homebrew not found. Please install Node.js manually from https://nodejs.org"
                exit 1
            fi
            ;;
        *)
            log_error "Please install Node.js 18+ manually from https://nodejs.org"
            exit 1
            ;;
    esac
    log_success "Node.js installed successfully"
}

# Install Hamlib (rigctl)
install_hamlib() {
    if command_exists rigctl; then
        log_success "Hamlib (rigctl) is already installed"
        return
    fi

    log_info "Installing Hamlib..."
    case $OS in
        ubuntu)
            sudo apt-get update
            sudo apt-get install -y hamlib-utils
            ;;
        fedora)
            sudo dnf install -y hamlib
            ;;
        arch)
            sudo pacman -S --noconfirm hamlib
            ;;
        macos)
            if command_exists brew; then
                brew install hamlib
            else
                log_error "Homebrew not found. Please install Hamlib manually"
                exit 1
            fi
            ;;
        *)
            log_error "Please install Hamlib manually for your platform"
            exit 1
            ;;
    esac
    log_success "Hamlib installed successfully"
}

# Clone RigBoss repository
clone_rigboss() {
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "RigBoss directory already exists. Updating..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        log_info "Cloning RigBoss repository..."
        git clone "$RIGBOSS_REPO" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    log_success "RigBoss repository ready"
}

# Install dependencies
install_dependencies() {
    log_info "Installing RigBoss dependencies..."
    npm install
    log_success "Dependencies installed"
}

# Build backend
build_backend() {
    log_info "Building backend..."
    npm run build:backend
    log_success "Backend built successfully"
}

# Create environment files
create_env_files() {
    log_info "Creating environment configuration..."
    
    # Backend .env
    if [ ! -f "packages/backend/.env" ]; then
        cp packages/backend/.env.example packages/backend/.env
        log_success "Backend .env created from example"
    else
        log_info "Backend .env already exists"
    fi

    # Frontend .env
    if [ ! -f "packages/frontend/.env" ]; then
        cp packages/frontend/.env.example packages/frontend/.env
        log_success "Frontend .env created from example"
    else
        log_info "Frontend .env already exists"
    fi
}

# Create systemd service (Linux only)
create_service() {
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "fedora" ]] || [[ "$OS" == "arch" ]]; then
        log_info "Creating systemd service..."
        sudo tee /etc/systemd/system/rigboss.service > /dev/null << EOF
[Unit]
Description=RigBoss Ham Radio Control
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm run start:backend
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        log_success "Systemd service created"
        log_info "To enable auto-start: sudo systemctl enable rigboss"
        log_info "To start now: sudo systemctl start rigboss"
    fi
}

# Test installation
test_installation() {
    log_info "Testing installation..."
    
    # Test rigctl
    if command_exists rigctl; then
        log_success "rigctl command available"
    else
        log_error "rigctl not found in PATH"
        exit 1
    fi
    
    # Test Node.js
    if command_exists node && command_exists npm; then
        log_success "Node.js and npm available"
    else
        log_error "Node.js or npm not found"
        exit 1
    fi
    
    log_success "Installation test passed"
}

# Main installation function
main() {
    echo "=================================================="
    echo "         RigBoss Installation Script v$RIGBOSS_VERSION"
    echo "=================================================="
    echo ""
    
    detect_os
    
    # Check for git
    if ! command_exists git; then
        log_error "Git is required but not installed. Please install git first."
        exit 1
    fi
    
    install_nodejs
    install_hamlib
    clone_rigboss
    install_dependencies
    build_backend
    create_env_files
    create_service
    test_installation
    
    echo ""
    echo "=================================================="
    log_success "RigBoss installation completed successfully!"
    echo "=================================================="
    echo ""
    echo "Next steps:"
    echo "1. Connect your radio via USB/Serial"
    echo "2. Edit configuration: nano $INSTALL_DIR/packages/backend/.env"
    echo "3. Start backend: cd $INSTALL_DIR && npm run start:backend"
    echo "4. Start frontend: cd $INSTALL_DIR && npm run dev:frontend"
    echo ""
    echo "For cross-network setup, edit packages/frontend/.env"
    echo "Documentation: $INSTALL_DIR/README.md"
    echo ""
    echo "73, and happy DXing!"
}

# Run main function
main "$@"
