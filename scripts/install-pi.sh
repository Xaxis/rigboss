#!/usr/bin/env bash
set -euo pipefail

if [[ $(id -u) -ne 0 ]]; then
  echo "Please run as root (sudo $0)" >&2
  exit 1
fi

# 1) Node 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2) System packages: ffmpeg, ALSA, Hamlib
apt-get update
apt-get install -y ffmpeg alsa-utils hamlib git

# 3) Clone repo if not present
if [[ ! -d /opt/rigboss ]]; then
  git clone https://github.com/your-username/rigboss.git /opt/rigboss
fi
cd /opt/rigboss

# 4) Install dependencies
npm ci

# 5) Copy default env if missing
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

cat <<EOF
Done. Next steps:
1) Start rigctld for your radio (e.g., IC-7300):
   rigctld -m 229 -r /dev/ttyUSB0 -s 115200

2) Run rigboss in dev mode:
   cd /opt/rigboss && npm run dev

3) From your laptop: open http://<pi-ip>:3000
   The app will auto-connect to rigctld and enable cross-platform audio streaming.

Audio devices:
- Linux: Uses ALSA (plughw:1,0 for USB audio)
- macOS: Uses AVFoundation (:0 for default)
- Windows: Uses DirectShow (audio= for default)
- All platforms require ffmpeg for audio streaming
EOF

