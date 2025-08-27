#!/usr/bin/env node

const { spawn } = require('child_process');
const { platform } = require('os');

console.log('🎵 Audio Pipeline Test');
console.log('=====================');

const os = platform();
console.log(`Platform: ${os}`);

// Test ffmpeg audio capture
function testAudioCapture() {
  console.log('\n📥 Testing Audio Capture...');
  
  let ffmpegArgs;
  
  if (os === 'linux') {
    // Test with default ALSA device
    ffmpegArgs = [
      '-f', 'alsa',
      '-i', 'default',
      '-ar', '48000',
      '-ac', '1',
      '-f', 's16le',
      '-t', '2', // 2 seconds
      '-'
    ];
  } else if (os === 'darwin') {
    // Test with default macOS audio
    ffmpegArgs = [
      '-f', 'avfoundation',
      '-i', ':0',
      '-ar', '48000',
      '-ac', '1',
      '-f', 's16le',
      '-t', '2',
      '-'
    ];
  } else {
    console.log('⚠️  Audio capture test not implemented for this platform');
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    console.log(`Running: ffmpeg ${ffmpegArgs.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    
    let dataReceived = 0;
    
    ffmpeg.stdout.on('data', (chunk) => {
      dataReceived += chunk.length;
    });
    
    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.log('❌ Error:', message.trim());
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && dataReceived > 0) {
        console.log(`✅ Audio capture successful! Received ${dataReceived} bytes of PCM data`);
      } else {
        console.log(`❌ Audio capture failed (code: ${code}, data: ${dataReceived} bytes)`);
      }
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      ffmpeg.kill('SIGTERM');
      console.log('⏰ Test timed out');
      resolve();
    }, 5000);
  });
}

// Test ffmpeg audio playback
function testAudioPlayback() {
  console.log('\n📤 Testing Audio Playback...');
  
  let ffmpegArgs;
  
  if (os === 'linux') {
    // Test with default ALSA device
    ffmpegArgs = [
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '1',
      '-i', '-',
      '-f', 'alsa',
      'default'
    ];
  } else if (os === 'darwin') {
    // Test with default macOS audio
    ffmpegArgs = [
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '1',
      '-i', '-',
      '-f', 'avfoundation',
      ':0'
    ];
  } else {
    console.log('⚠️  Audio playback test not implemented for this platform');
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    console.log(`Running: ffmpeg ${ffmpegArgs.join(' ')}`);
    console.log('🔊 You should hear a brief tone...');
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    
    // Generate a simple sine wave tone (440Hz for 1 second)
    const sampleRate = 48000;
    const duration = 1; // seconds
    const frequency = 440; // Hz
    const samples = sampleRate * duration;
    const buffer = Buffer.alloc(samples * 2); // 16-bit samples
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 16384;
      buffer.writeInt16LE(sample, i * 2);
    }
    
    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();
    
    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.log('❌ Error:', message.trim());
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Audio playback test completed');
      } else {
        console.log(`❌ Audio playback failed (code: ${code})`);
      }
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      ffmpeg.kill('SIGTERM');
      console.log('⏰ Test timed out');
      resolve();
    }, 5000);
  });
}

async function main() {
  try {
    await testAudioCapture();
    await testAudioPlayback();
    
    console.log('\n🎯 Test Summary:');
    console.log('- If capture worked: rigboss can read from your audio input');
    console.log('- If playback worked: rigboss can write to your audio output');
    console.log('- Both needed for full RX/TX audio streaming');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
