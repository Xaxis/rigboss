#!/bin/bash

# rigboss - Test rigctld connection
# This script tests if rigctld is running and responsive

echo "Testing rigctld connection..."

# Test if rigctld is listening on port 4532
if ! nc -z localhost 4532 2>/dev/null; then
    echo "Error: rigctld is not running on localhost:4532"
    echo ""
    echo "Start rigctld first:"
    echo "  ./scripts/start-rigctld.sh"
    echo ""
    echo "Or for real hardware (example for IC-7300):"
    echo "  rigctld -m 229 -r /dev/ttyUSB0 -s 115200"
    echo ""
    exit 1
fi

echo "✓ rigctld is listening on port 4532"

# Test basic commands
echo "Testing basic rigctld commands..."

# Test frequency query
echo -n "Testing frequency query... "
FREQ=$(echo "f" | nc -w 1 localhost 4532 2>/dev/null | head -1)
if [ $? -eq 0 ] && [ -n "$FREQ" ]; then
    echo "✓ Got frequency: $FREQ Hz"
else
    echo "✗ Failed"
    exit 1
fi

# Test mode query
echo -n "Testing mode query... "
MODE=$(echo "m" | nc -w 1 localhost 4532 2>/dev/null | head -1)
if [ $? -eq 0 ] && [ -n "$MODE" ]; then
    echo "✓ Got mode: $MODE"
else
    echo "✗ Failed"
    exit 1
fi

# Test rig info
echo -n "Testing rig info... "
INFO=$(echo "_" | nc -w 1 localhost 4532 2>/dev/null | head -1)
if [ $? -eq 0 ] && [ -n "$INFO" ]; then
    echo "✓ Got rig info: $INFO"
else
    echo "✗ Failed"
    exit 1
fi

echo ""
echo "✓ All tests passed! rigctld is working correctly."
echo "You can now start rigboss with: npm run dev"
