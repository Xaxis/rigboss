#!/usr/bin/env bash
set -euo pipefail

# Cross-platform ffmpeg installer for rigboss audio streaming

detect_os() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macos"
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "windows"
  else
    echo "unknown"
  fi
}

install_ffmpeg() {
  local os=$(detect_os)
  
  echo "Installing ffmpeg for $os..."
  
  case $os in
    "linux")
      if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg alsa-utils
      elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y ffmpeg alsa-utils
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S ffmpeg alsa-utils
      else
        echo "Please install ffmpeg and alsa-utils manually for your Linux distribution"
        exit 1
      fi
      ;;
    "macos")
      if command -v brew >/dev/null 2>&1; then
        brew install ffmpeg
      else
        echo "Please install Homebrew first: https://brew.sh"
        echo "Then run: brew install ffmpeg"
        exit 1
      fi
      ;;
    "windows")
      echo "Please install ffmpeg for Windows:"
      echo "1. Download from https://ffmpeg.org/download.html#build-windows"
      echo "2. Extract and add to PATH"
      echo "3. Or use chocolatey: choco install ffmpeg"
      exit 1
      ;;
    *)
      echo "Unsupported OS: $OSTYPE"
      exit 1
      ;;
  esac
}

verify_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then
    echo "✓ ffmpeg is installed and available"
    ffmpeg -version | head -1
    return 0
  else
    echo "✗ ffmpeg not found in PATH"
    return 1
  fi
}

main() {
  echo "rigboss Audio Setup"
  echo "==================="
  
  if verify_ffmpeg; then
    echo "ffmpeg is already installed. Audio streaming should work."
  else
    echo "ffmpeg not found. Installing..."
    install_ffmpeg
    
    if verify_ffmpeg; then
      echo "✓ ffmpeg installation successful"
    else
      echo "✗ ffmpeg installation failed"
      exit 1
    fi
  fi
  
  echo ""
  echo "Audio streaming is now ready!"
  echo "Start rigboss with: npm run dev"
}

main "$@"
