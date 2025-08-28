# RigBoss Windows Installer Script
# PowerShell script for Windows 10/11

param(
    [string]$InstallDir = "$env:USERPROFILE\rigboss",
    [switch]$SkipHamlib = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Install Chocolatey if not present
function Install-Chocolatey {
    if (Test-Command "choco") {
        Write-Success "Chocolatey is already installed"
        return
    }
    
    Write-Info "Installing Chocolatey package manager..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Chocolatey installed successfully"
}

# Install Node.js
function Install-NodeJS {
    if (Test-Command "node") {
        $nodeVersion = (node --version).Substring(1).Split('.')[0]
        if ([int]$nodeVersion -ge 18) {
            Write-Success "Node.js $nodeVersion is already installed"
            return
        }
    }
    
    Write-Info "Installing Node.js..."
    choco install nodejs -y
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Node.js installed successfully"
}

# Install Git
function Install-Git {
    if (Test-Command "git") {
        Write-Success "Git is already installed"
        return
    }
    
    Write-Info "Installing Git..."
    choco install git -y
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Git installed successfully"
}

# Install Hamlib
function Install-Hamlib {
    if ($SkipHamlib) {
        Write-Warning "Skipping Hamlib installation (use -SkipHamlib to skip)"
        return
    }
    
    if (Test-Command "rigctl") {
        Write-Success "Hamlib (rigctl) is already installed"
        return
    }
    
    Write-Info "Installing Hamlib..."
    Write-Info "Downloading Hamlib for Windows..."
    
    $hamlibUrl = "https://github.com/Hamlib/Hamlib/releases/download/4.5.5/hamlib-w64-4.5.5.zip"
    $tempDir = "$env:TEMP\hamlib"
    $zipFile = "$tempDir\hamlib.zip"
    $installPath = "$env:ProgramFiles\Hamlib"
    
    # Create temp directory
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Download Hamlib
    Invoke-WebRequest -Uri $hamlibUrl -OutFile $zipFile
    
    # Extract
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    
    # Install to Program Files (requires admin)
    if (Test-Administrator) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
        Copy-Item -Path "$tempDir\hamlib-w64-4.5.5\*" -Destination $installPath -Recurse -Force
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$installPath\bin*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installPath\bin", "Machine")
        }
    } else {
        # Install to user directory
        $userInstallPath = "$env:USERPROFILE\Hamlib"
        New-Item -ItemType Directory -Path $userInstallPath -Force | Out-Null
        Copy-Item -Path "$tempDir\hamlib-w64-4.5.5\*" -Destination $userInstallPath -Recurse -Force
        
        # Add to user PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$userInstallPath\bin*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$userInstallPath\bin", "User")
        }
    }
    
    # Cleanup
    Remove-Item -Path $tempDir -Recurse -Force
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Success "Hamlib installed successfully"
}

# Clone RigBoss repository
function Install-RigBoss {
    if (Test-Path $InstallDir) {
        Write-Warning "RigBoss directory already exists. Updating..."
        Set-Location $InstallDir
        git pull origin main
    } else {
        Write-Info "Cloning RigBoss repository..."
        git clone "https://github.com/your-username/rigboss.git" $InstallDir
        Set-Location $InstallDir
    }
    
    Write-Info "Installing RigBoss dependencies..."
    npm install
    
    Write-Info "Building backend..."
    npm run build:backend
    
    Write-Success "RigBoss installed successfully"
}

# Create environment files
function Create-EnvironmentFiles {
    Write-Info "Creating environment configuration..."
    
    # Backend .env
    $backendEnvPath = "$InstallDir\packages\backend\.env"
    if (-not (Test-Path $backendEnvPath)) {
        @"
# RigBoss Backend Configuration
PORT=3001
HOST=0.0.0.0

# Radio Configuration (edit as needed)
USE_REAL_RADIO=false
RIG_MODEL=3085
RIG_PORT=COM3
RIG_SPEED=19200

# Logging
LOG_LEVEL=info
NODE_ENV=production
"@ | Out-File -FilePath $backendEnvPath -Encoding UTF8
        Write-Success "Backend .env created"
    } else {
        Write-Info "Backend .env already exists"
    }
    
    # Frontend .env
    $frontendEnvPath = "$InstallDir\packages\frontend\.env"
    if (-not (Test-Path $frontendEnvPath)) {
        @"
# RigBoss Frontend Configuration
BACKEND_URL=http://localhost:3001
"@ | Out-File -FilePath $frontendEnvPath -Encoding UTF8
        Write-Success "Frontend .env created"
    } else {
        Write-Info "Frontend .env already exists"
    }
}

# Create desktop shortcuts
function Create-Shortcuts {
    Write-Info "Creating desktop shortcuts..."
    
    $shell = New-Object -ComObject WScript.Shell
    $desktop = $shell.SpecialFolders("Desktop")
    
    # Backend shortcut
    $backendShortcut = $shell.CreateShortcut("$desktop\RigBoss Backend.lnk")
    $backendShortcut.TargetPath = "cmd.exe"
    $backendShortcut.Arguments = "/k cd /d `"$InstallDir`" && npm run start:backend"
    $backendShortcut.WorkingDirectory = $InstallDir
    $backendShortcut.IconLocation = "shell32.dll,25"
    $backendShortcut.Save()
    
    # Frontend shortcut
    $frontendShortcut = $shell.CreateShortcut("$desktop\RigBoss Frontend.lnk")
    $frontendShortcut.TargetPath = "cmd.exe"
    $frontendShortcut.Arguments = "/k cd /d `"$InstallDir`" && npm run dev:frontend"
    $frontendShortcut.WorkingDirectory = $InstallDir
    $frontendShortcut.IconLocation = "shell32.dll,14"
    $frontendShortcut.Save()
    
    Write-Success "Desktop shortcuts created"
}

# Test installation
function Test-Installation {
    Write-Info "Testing installation..."
    
    # Test commands
    $commands = @("node", "npm", "git")
    if (-not $SkipHamlib) { $commands += "rigctl" }
    
    foreach ($cmd in $commands) {
        if (Test-Command $cmd) {
            Write-Success "$cmd command available"
        } else {
            Write-Error "$cmd not found in PATH"
            return $false
        }
    }
    
    Write-Success "Installation test passed"
    return $true
}

# Main installation function
function Main {
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "         RigBoss Windows Installation Script" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Install-Chocolatey
        Install-NodeJS
        Install-Git
        Install-Hamlib
        Install-RigBoss
        Create-EnvironmentFiles
        Create-Shortcuts
        
        if (Test-Installation) {
            Write-Host ""
            Write-Host "==================================================" -ForegroundColor Green
            Write-Success "RigBoss installation completed successfully!"
            Write-Host "==================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Yellow
            Write-Host "1. Connect your radio via USB/Serial" -ForegroundColor White
            Write-Host "2. Edit configuration: $InstallDir\packages\backend\.env" -ForegroundColor White
            Write-Host "3. Use desktop shortcuts to start RigBoss" -ForegroundColor White
            Write-Host ""
            Write-Host "Documentation: $InstallDir\README.md" -ForegroundColor White
            Write-Host ""
            Write-Host "73, and happy DXing!" -ForegroundColor Cyan
        }
    } catch {
        Write-Error "Installation failed: $_"
        exit 1
    }
}

# Run main function
Main
