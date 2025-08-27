# rigboss Development Guide

## Overview

rigboss is a modern, web-based ham radio rig control interface built with:

- **Frontend**: Astro + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Radio Interface**: Hamlib rigctld TCP socket communication
- **Real-time**: WebSocket communication for live updates

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    TCP Socket    ┌─────────────────┐
│   Astro SPA     │ ◄──────────────► │   Node.js       │ ◄───────────────► │     rigctld     │
│   (Frontend)    │                 │   Backend       │                  │   (Hamlib)      │
└─────────────────┘                 └─────────────────┘                  └─────────────────┘
                                                                                    │
                                                                                    ▼
                                                                          ┌─────────────────┐
                                                                          │   Ham Radio     │
                                                                          │   Transceiver   │
                                                                          └─────────────────┘
```

## Project Structure

```
rigboss/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── RadioInterface.tsx      # Main interface
│   │   ├── FrequencyDisplay.tsx    # Frequency control
│   │   ├── ModeSelector.tsx        # Mode selection
│   │   ├── PowerControl.tsx        # Power control
│   │   ├── PTTButton.tsx          # Push-to-talk
│   │   └── ConnectionStatus.tsx    # Status indicators
│   ├── layouts/           # Astro layouts
│   ├── pages/             # Astro pages
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── backend/               # Backend source code
│   ├── services/          # Business logic
│   │   └── RigctlService.ts       # rigctld interface
│   └── server.ts          # Main server
├── scripts/               # Utility scripts
├── docs/                  # Documentation
└── dist/                  # Built application
```

## Development Setup

### Prerequisites

1. **Node.js 18+**
2. **Hamlib** (for rigctld):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libhamlib-utils
   
   # macOS
   brew install hamlib
   
   # Or build from source
   git clone https://github.com/Hamlib/Hamlib.git
   ```

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url> rigboss
   cd rigboss
   npm install
   ```

2. **Start rigctld** (in a separate terminal):
   ```bash
   # For testing without hardware (dummy rig)
   ./scripts/start-rigctld.sh
   
   # For real hardware (example: IC-7300)
   rigctld -m 229 -r /dev/ttyUSB0 -s 115200
   
   # For network radios (example: IC-705)
   rigctld -m 229 -r 192.168.1.100:50001
   ```

3. **Test rigctld connection**:
   ```bash
   ./scripts/test-rigctld.sh
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

5. **Open browser**: http://localhost:3000

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the Astro frontend
- `npm run dev:backend` - Start only the Node.js backend
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## Configuration

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
# Backend Server
BACKEND_PORT=3001
NODE_ENV=development

# rigctld Configuration
RIGCTLD_HOST=localhost
RIGCTLD_PORT=4532

# Polling Configuration
POLL_INTERVAL=1000

# Frontend Configuration
BACKEND_URL=http://localhost:3001
```

### Radio Configuration

rigboss works with any radio supported by Hamlib. Common configurations:

#### Icom IC-7300
```bash
rigctld -m 229 -r /dev/ttyUSB0 -s 115200
```

#### Icom IC-705 (Network)
```bash
rigctld -m 229 -r 192.168.1.100:50001
```

#### Yaesu FT-991A
```bash
rigctld -m 135 -r /dev/ttyUSB0 -s 38400
```

#### Kenwood TS-890S
```bash
rigctld -m 214 -r /dev/ttyUSB0 -s 115200
```

## Development Workflow

### Adding New Features

1. **Define types** in `src/types/radio.ts`
2. **Backend logic** in `backend/services/RigctlService.ts`
3. **API endpoints** in `backend/server.ts`
4. **Frontend components** in `src/components/`
5. **Integration** in `src/components/RadioInterface.tsx`

### Testing

1. **Unit tests**: `npm run test`
2. **Manual testing**: Use dummy rig with `./scripts/start-rigctld.sh`
3. **Hardware testing**: Connect real radio and test all functions

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with ham radio specific rules
- **Prettier**: Consistent code formatting
- **Git hooks**: Pre-commit linting and formatting

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Raspberry Pi Deployment

1. **Install Node.js and Hamlib**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs libhamlib-utils
   ```

2. **Clone and build**:
   ```bash
   git clone <repository-url> rigboss
   cd rigboss
   npm install
   npm run build
   ```

3. **Create systemd service**:
   ```bash
   sudo cp scripts/rigboss.service /etc/systemd/system/
   sudo systemctl enable rigboss
   sudo systemctl start rigboss
   ```

4. **Configure firewall**:
   ```bash
   sudo ufw allow 3000
   sudo ufw allow 3001
   ```

### Docker Deployment

```bash
docker build -t rigboss .
docker run -p 3000:3000 -p 3001:3001 --device=/dev/ttyUSB0 rigboss
```

## Troubleshooting

### Common Issues

1. **rigctld not found**:
   - Install Hamlib: `sudo apt-get install libhamlib-utils`
   - Check PATH: `which rigctld`

2. **Permission denied on serial port**:
   - Add user to dialout group: `sudo usermod -a -G dialout $USER`
   - Logout and login again

3. **Radio not responding**:
   - Check cable connections
   - Verify baud rate and radio model
   - Test with `rigctl` directly

4. **Frontend not connecting**:
   - Check backend is running on port 3001
   - Verify WebSocket connection in browser dev tools
   - Check firewall settings

### Debug Mode

Enable verbose logging:

```bash
# Backend debug
DEBUG=rigboss:* npm run dev:backend

# rigctld debug
rigctld -m 229 -r /dev/ttyUSB0 -s 115200 -vvv
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Run linting: `npm run lint`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Submit a pull request

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**73!** 📻
