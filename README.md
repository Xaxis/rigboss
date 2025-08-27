# rigboss

A modern, web-based ham radio rig control interface designed for the Raspberry Pi and other platforms. rigboss provides an elegant, touch-friendly interface for controlling amateur radio transceivers through a clean web interface.

## Features

- 🎛️ **Modern Web Interface**: Clean, responsive design optimized for touch screens
- 📻 **Universal Radio Support**: Works with any radio supported by Hamlib/rigctld
- 🌊 **Real-time Spectrum Display**: Live spectrum analyzer and waterfall for supported radios
- 🎵 **Audio Streaming**: Low-latency audio streaming using Web Audio API and WebRTC
- 📱 **Progressive Web App**: Install as a native app on mobile devices
- 🌙 **Dark/Light Themes**: Automatic theme switching based on system preferences
- 🔧 **Comprehensive Controls**: Frequency, mode, power, filters, and memory management
- 🎯 **Touch Optimized**: Designed for tablet and touch screen operation

## Supported Radios

rigboss works with any radio supported by Hamlib, including:

- **Icom**: IC-7300, IC-7610, IC-705, IC-9700, IC-R8600, and many others
- **Yaesu**: FT-991A, FT-891, FT-dx101, and more
- **Kenwood**: TS-890S, TS-590SG, TS-480, and others
- **Xiegu**: X6100, G90, and other models

## Architecture

```
Radio ↔ rigctld ↔ Node.js Backend ↔ WebSocket ↔ Astro Frontend
                     ↕
                Audio Streaming (WebRTC)
```

### Technology Stack

- **Frontend**: Astro + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Radio Interface**: Hamlib rigctld TCP socket communication
- **Audio**: Web Audio API + WebRTC for real-time streaming
- **Build**: Vite + TypeScript + ESLint + Prettier

## Quick Start

### Prerequisites

1. **Hamlib** installed on your system:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libhamlib-utils

   # macOS
   brew install hamlib

   # Or build from source: https://github.com/Hamlib/Hamlib
   ```

2. **Node.js 18+** installed

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/rigboss.git
   cd rigboss
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start rigctld for your radio:
   ```bash
   # Example for Icom IC-7300 on USB
   rigctld -m 229 -r /dev/ttyUSB0 -s 115200

   # Example for network-enabled radio
   rigctld -m 229 -r 192.168.1.100:50001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

## Raspberry Pi (full-stack) setup

The intended deployment is to run both the backend and frontend on your Raspberry Pi that is physically connected to the radio (USB CAT + USB audio). Then access the UI from any device on your network.

1) Install Node 20 LTS on the Pi
- Recommended (NodeSource):
  - curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  - sudo apt-get install -y nodejs

2) Install system packages
- sudo apt-get update
- sudo apt-get install -y ffmpeg alsa-utils hamlib

3) Clone and configure
- git clone https://github.com/your-username/rigboss.git
- cd rigboss
- cp .env.example .env
- Edit .env (minimum):
  - BACKEND_PORT=3001
  - RIGCTLD_HOST=localhost
  - RIGCTLD_PORT=4532
  - POLL_INTERVAL=1000
  - BACKEND_URL=http://localhost:3001

4) Install dependencies
- npm ci

5) Start rigctld for your radio (examples)
- IC-7300 (USB): rigctld -m 229 -r /dev/ttyUSB0 -s 115200
- IC-705 (Network): rigctld -m 229 -r 192.168.1.100:50001

6) Run rigboss (dev)
- npm run dev
- Open http://<pi-ip>:3000 from your laptop/phone
- In the Connection modal, connect to host=localhost, port=4532 (this connects the Pi backend to the Pi’s rigctld)

7) Audio device discovery (for streaming)
- List devices: arecord -l and aplay -l
- Note the radio’s USB audio capture/playback devices (e.g., hw:CARD=CODEC,DEV=0)

## Audio streaming (WebRTC) requirements

- Node 20 LTS on the backend host (Pi)
- ffmpeg and ALSA utils installed (see above)
- wrtc (node-webrtc) package will be used by the backend to enable WebRTC audio. The backend feature-detects wrtc and logs a warning if unavailable; control UI remains fully functional.
- RX path: Pi captures from the radio’s ALSA device and streams Opus to the browser.
- TX path: Browser mic is sent to the backend and written to the radio’s ALSA playback device; gated by rigctl PTT.

Troubleshooting
- If you don’t hear audio yet, check backend logs for “[WebRTCAudioService] wrtc not available” or ffmpeg errors.
- Verify Node version: node -v (should be v20.x on the Pi).
- Verify audio devices exist: arecord -l, aplay -l.

## Development options

- Full-stack (recommended): run both backend and frontend on the Pi as above. Browse to http://<pi-ip>:3000.
- Control-only from laptop (no audio):
  - Run rigctld on the Pi as above.
  - On your laptop: npm run dev
  - In the UI Connection modal, enter host=<pi-ip>, port=4532. You can control the rig through the Pi’s rigctld; audio streaming is not available in this mode since the backend isn’t on the Pi’s ALSA devices.


## Configuration

rigboss can be configured through the web interface or by editing the configuration files:

- **Radio Settings**: Configure radio model, connection, and polling intervals
- **Audio Settings**: Set up audio devices, gain levels, and processing
- **UI Preferences**: Customize theme, layout, and touch behavior
- **Network Settings**: Configure server ports and remote access

## Development

### Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Hamlib Project**: For providing the excellent radio control library
- **wfview**: For inspiration and reference implementation
- **Amateur Radio Community**: For feedback and testing

---

**73!** 📻