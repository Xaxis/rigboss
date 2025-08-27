# rigboss

Modern web-based ham radio rig control with cross-platform audio streaming.

## Quick Start

```bash
git clone https://github.com/your-username/rigboss.git
cd rigboss
npm install  # This does EVERYTHING - installs deps, ffmpeg, creates config
```

Then:
1. Connect your radio via USB (CAT + Audio)
2. Start rigctld: `rigctld -m 229 -r /dev/ttyUSB0 -s 115200`
3. Run rigboss: `npm run dev`
4. Open http://localhost:3000

**That's it!** The app auto-connects to rigctld and enables audio streaming.

## What You Get

- **Radio Control**: Frequency, mode, power, PTT via web interface
- **Audio Streaming**: Hear radio RX in browser, transmit mic via PTT
- **Cross-Platform**: Works on Linux, macOS, Windows (via ffmpeg)
- **Zero Config**: Auto-detects audio devices, auto-connects to rigctld
- **Responsive**: Works on desktop, tablet, mobile

## Supported Radios

Any radio supported by Hamlib. Common examples:
- **Icom IC-7300**: `rigctld -m 229 -r /dev/ttyUSB0 -s 115200`
- **Yaesu FT-991A**: `rigctld -m 135 -r /dev/ttyUSB0 -s 38400`
- **Icom IC-705** (network): `rigctld -m 229 -r 192.168.1.100:50001`

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