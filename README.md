# RigBoss - Professional Ham Radio Control Interface

**Modern, web-based SPA for controlling ham radio rigs with advanced spectrum analysis and audio processing.**

![RigBoss](https://img.shields.io/badge/RigBoss-v0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi%20%7C%20Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)

## 🎯 Overview

RigBoss is a professional-grade web application designed for ham radio operators who demand modern, intuitive control of their radio equipment. Built with cutting-edge web technologies, it provides real-time radio control, advanced spectrum analysis, and professional audio processing capabilities.

### ✨ Key Features

- **🎛️ Complete Radio Control** - Frequency, mode, power, VFO operations
- **📊 Advanced Spectrum Analyzer** - Real-time FFT with waterfall display
- **🔊 Professional Audio System** - Dual audio routing with processing
- **💾 Memory Management** - Channel storage and band presets
- **📝 QSO Logging** - ADIF/Cabrillo export capabilities
- **🌐 Cross-Network Support** - Frontend on laptop, backend on Pi
- **🎨 Modern UX** - Dark/light themes, responsive design
- **⚡ Real-time Updates** - WebSocket-based live feedback

## 🏗️ Architecture

```
rigboss/
├── packages/
│   ├── frontend/          # React + TypeScript + Vite SPA
│   └── backend/           # Node.js + Fastify + Hamlib
├── docs/                  # Documentation
└── scripts/               # Setup and deployment scripts
```

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** + **Radix UI** for design system
- **Zustand** for state management
- **Socket.IO** for real-time communication

### Backend Stack
- **Node.js** with **Fastify** framework
- **Hamlib** for radio control (rigctl)
- **Socket.IO** for WebSocket communication
- **FFT processing** for spectrum analysis
- **Audio routing** with device management

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- **Hamlib** installed (`rigctl` command available)
- **Radio connected** via USB/Serial

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rigboss.git
   cd rigboss
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Copy example environment files
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   
   # Edit configuration as needed
   nano packages/backend/.env
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend
   
   # Terminal 2 - Frontend  
   npm run dev:frontend
   ```

5. **Open application:**
   - Frontend: http://localhost:4322
   - Backend API: http://localhost:3001

## 🔧 Configuration

### Backend Configuration

Edit `packages/backend/.env`:

```env
# Radio Configuration
RIG_MODEL=3085              # Icom IC-7300
RIG_PORT=/dev/ttyUSB0       # Serial port
RIG_SPEED=19200             # Baud rate

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Audio Configuration
AUDIO_SAMPLE_RATE=48000
AUDIO_BUFFER_SIZE=1024

# Spectrum Configuration
FFT_SIZE=2048
SPECTRUM_UPDATE_RATE=30
```

### Frontend Configuration

Edit `packages/frontend/.env`:

```env
# Backend URL (for cross-network setup)
BACKEND_URL=http://10.0.0.20:3001
```

## 🌐 Cross-Network Setup

RigBoss supports running the frontend on your laptop while the backend runs on a Raspberry Pi:

### On Raspberry Pi (Backend):
```bash
cd rigboss
npm run build:backend
npm run start:backend
```

### On Laptop (Frontend):
```bash
# Set backend URL in .env
echo "BACKEND_URL=http://10.0.0.20:3001" > packages/frontend/.env

# Start frontend
npm run dev:frontend
```

The frontend will automatically proxy API calls to the Pi backend.

## 📱 Supported Radios

RigBoss works with any radio supported by Hamlib:

- **Icom**: IC-7300, IC-7610, IC-9700, IC-705, etc.
- **Yaesu**: FT-991A, FT-710, FT-DX101, etc.  
- **Kenwood**: TS-590, TS-890, TS-990, etc.
- **And 200+ more models**

## 🛠️ Development

### Project Structure

```
packages/frontend/src/
├── components/
│   ├── audio/             # Audio system components
│   ├── layout/            # App layout components  
│   ├── panels/            # Main panel components
│   ├── radio/             # Radio control components
│   ├── spectrum/          # Spectrum analyzer components
│   └── ui/                # Reusable UI components
├── stores/                # Zustand state stores
├── services/              # API and WebSocket services
├── types/                 # TypeScript type definitions
└── styles/                # Global styles and themes
```

### Available Scripts

```bash
# Development
npm run dev                # Start both frontend and backend
npm run dev:frontend       # Frontend only
npm run dev:backend        # Backend only

# Building
npm run build              # Build both packages
npm run build:frontend     # Frontend only  
npm run build:backend      # Backend only

# Production
npm run start              # Start production servers
npm run start:frontend     # Frontend production server
npm run start:backend      # Backend production server

# Utilities
npm run typecheck          # TypeScript checking
npm run lint               # Code linting
npm run test               # Run tests
```

## 🐛 Troubleshooting

### Common Issues

**Radio not connecting:**
- Check USB/Serial connection
- Verify rigctl works: `rigctl -m 3085 -r /dev/ttyUSB0 f`
- Check permissions: `sudo usermod -a -G dialout $USER`

**Audio not working:**
- Check device permissions
- Verify HTTPS for microphone access
- Check audio device selection in settings

**Cross-network issues:**
- Verify backend URL in frontend .env
- Check firewall settings on Pi
- Ensure both devices on same network

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/rigboss/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/rigboss/discussions)
- **Email**: support@rigboss.dev

---

**Built with ❤️ for the ham radio community**

*73, and happy DXing!*
