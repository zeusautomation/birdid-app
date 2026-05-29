#!/usr/bin/env bash
set -euo pipefail

echo "=== BirdID Setup ==="
echo ""

# Check Python 3
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required. Install from https://python.org"
  exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $PYTHON_VERSION found"

# Check pip
if ! python3 -m pip --version &>/dev/null; then
  echo "❌ pip not found. Install pip first."
  exit 1
fi

echo ""
echo "Installing BirdNET..."
python3 -m pip install birdnet --upgrade

echo ""
echo "Verifying BirdNET installation..."
if python3 -c "import birdnet; print('BirdNET version:', birdnet.__version__)" 2>/dev/null; then
  echo "✓ BirdNET installed successfully"
else
  echo "⚠️  BirdNET installed but version check failed — this is usually fine."
fi

echo ""

# Check ffmpeg
if command -v ffmpeg &>/dev/null; then
  FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')
  echo "✓ ffmpeg $FFMPEG_VERSION found"
else
  echo "❌ ffmpeg not found!"
  echo ""
  echo "Install ffmpeg:"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  brew install ffmpeg"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  sudo apt install ffmpeg    # Ubuntu/Debian"
    echo "  sudo dnf install ffmpeg    # Fedora"
    echo "  sudo pacman -S ffmpeg      # Arch"
  else
    echo "  https://ffmpeg.org/download.html"
  fi
  echo ""
  echo "ffmpeg is required for video file support (audio extraction and frame capture)."
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "To run the app:"
echo "  npm run dev     # development"
echo "  npm run build && npm start  # production"
echo ""
echo "The app will be available at http://localhost:3000"
