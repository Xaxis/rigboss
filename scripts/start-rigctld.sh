#!/bin/bash

# rigboss - Start rigctld for testing
# This script starts rigctld with dummy rig for testing without hardware

echo "Starting rigctld with dummy rig for testing..."
echo "This allows testing rigboss without actual radio hardware."
echo ""

# Check if rigctld is available
if ! command -v rigctld &> /dev/null; then
    echo "Error: rigctld not found. Please install Hamlib:"
    echo ""
    echo "Ubuntu/Debian: sudo apt-get install libhamlib-utils"
    echo "macOS: brew install hamlib"
    echo "Or build from source: https://github.com/Hamlib/Hamlib"
    echo ""
    exit 1
fi

echo "Starting rigctld on localhost:4532 with dummy rig..."
echo "Press Ctrl+C to stop"
echo ""

# Start rigctld with dummy rig (model 1)
# This allows testing without actual hardware
rigctld -m 1 -r /dev/null -s 9600 -vvv

echo ""
echo "rigctld stopped."
