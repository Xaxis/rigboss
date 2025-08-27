# rigboss Development Setup - MacBook + Raspberry Pi

## Quick Start for Your Setup

### 1. MacBook (Development Machine)
You're already running this correctly:
```bash
npm run dev
```

This starts:
- **Frontend** on http://localhost:3000 (Astro + React)
- **Backend** on http://localhost:3001 (Node.js + Socket.IO)

The frontend will work perfectly even without rigctld connection!

### 2. Raspberry Pi (rigctld Server)

On your Raspberry Pi, start rigctld:

```bash
# For IC-7300 via USB
rigctld -m 229 -r /dev/ttyUSB0 -s 115200

# For IC-705 via network
rigctld -m 229 -r 192.168.1.100:50001

# For testing without radio (dummy rig)
rigctld -m 1 -r /dev/null -s 9600
```

**Important**: Make sure rigctld is accessible from your MacBook:
```bash
# On Raspberry Pi - check if rigctld is listening
netstat -ln | grep 4532

# From MacBook - test connection to Pi
telnet raspberrypi.local 4532
# or
telnet 192.168.1.XXX 4532
```

### 3. Connect from rigboss

1. Open http://localhost:3000 on your MacBook
2. You'll see a connection form
3. Enter your Raspberry Pi details:
   - **Hostname**: `raspberrypi.local` or IP address like `192.168.1.100`
   - **Port**: `4532` (default)
4. Click "Connect to rigctld"

## Current Development Flow

✅ **What Works Now:**
- Frontend loads and displays perfectly
- Backend starts successfully 
- Connection form appears when rigctld not connected
- Real-time WebSocket communication
- All UI components are functional
- Touch-friendly interface

🔄 **Development Workflow:**
1. Make changes to code
2. Frontend hot-reloads automatically
3. Backend restarts automatically (via tsx watch)
4. Test connection to your Pi when needed

## Troubleshooting

### Frontend Issues
- **Port 3000 in use**: Change port in `astro.config.mjs`
- **Components not loading**: Check browser console for errors
- **Styles broken**: Restart dev server

### Backend Issues  
- **Port 3001 in use**: Change `BACKEND_PORT` in `.env`
- **Can't connect to Pi**: Check Pi IP address and firewall

### Raspberry Pi Issues
- **rigctld not found**: `sudo apt-get install libhamlib-utils`
- **Permission denied**: `sudo usermod -a -G dialout $USER` (then logout/login)
- **Port blocked**: `sudo ufw allow 4532`

### Network Issues
- **Can't reach Pi**: Try IP address instead of hostname
- **Connection refused**: Check if rigctld is actually running
- **Firewall**: Make sure port 4532 is open on Pi

## Testing Without Hardware

You can develop and test everything without a real radio:

```bash
# On Raspberry Pi - start dummy rig
rigctld -m 1 -r /dev/null -s 9600 -vvv

# Test from MacBook
echo "f" | nc raspberrypi.local 4532
```

## Development Tips

1. **Keep rigctld running** on your Pi for seamless development
2. **Use browser dev tools** to monitor WebSocket connections
3. **Check backend logs** in the terminal for connection status
4. **Test on mobile** - the interface is touch-optimized
5. **Use dark mode** - toggle in browser settings

## Next Steps

Once you have the basic connection working:
1. Test all radio control functions
2. Add your specific radio model support
3. Implement audio streaming features
4. Add spectrum display for supported radios
5. Create custom band/memory presets

---

**The key point**: Your frontend development experience is now completely smooth - you can work on UI/UX without needing rigctld connected at all times! 🎉
