#!/usr/bin/env node

import { spawn } from 'child_process';
import { platform } from 'os';

console.log('🔧 rigboss Audio Pipeline Test');
console.log('==============================');

const os = platform();
console.log(`Platform: ${os}`);

// Test the complete audio pipeline
async function testPipeline() {
  console.log('\n📋 Testing Complete Audio Pipeline...');
  
  if (os !== 'linux') {
    console.log('⚠️  Pipeline test is designed for Linux (Pi)');
    console.log('   On other platforms, use the web audio test page');
    return;
  }
  
  // Test 1: Check if we can capture audio
  console.log('\n1️⃣ Testing audio capture...');
  const captureTest = await testCapture();
  
  if (!captureTest) {
    console.log('❌ Audio capture failed - pipeline cannot work');
    return;
  }
  
  // Test 2: Check if we can play audio
  console.log('\n2️⃣ Testing audio playback...');
  const playbackTest = await testPlayback();
  
  if (!playbackTest) {
    console.log('❌ Audio playback failed - TX audio will not work');
  }
  
  // Test 3: Test the actual pipeline (capture -> process -> play)
  console.log('\n3️⃣ Testing full pipeline (5 seconds)...');
  await testFullPipeline();
  
  console.log('\n🎯 Pipeline Test Summary:');
  console.log(`- Audio Capture: ${captureTest ? '✅ Working' : '❌ Failed'}`);
  console.log(`- Audio Playback: ${playbackTest ? '✅ Working' : '❌ Failed'}`);
  console.log('\n💡 Next Steps:');
  console.log('1. Start rigboss: npm run dev');
  console.log('2. Open audio test page: http://localhost:3000/audio-test');
  console.log('3. Click "Start RX Test" to test live audio streaming');
}

function testCapture() {
  return new Promise((resolve) => {
    console.log('   Capturing 2 seconds of audio...');
    
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'alsa',
      '-i', 'default',
      '-ar', '48000',
      '-ac', '1',
      '-f', 's16le',
      '-t', '2',
      '-'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    
    let dataReceived = 0;
    let hasError = false;
    
    ffmpeg.stdout.on('data', (chunk) => {
      dataReceived += chunk.length;
    });
    
    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error') || message.includes('Input/output error')) {
        console.log(`   ❌ ${message.trim()}`);
        hasError = true;
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && dataReceived > 0 && !hasError) {
        console.log(`   ✅ Captured ${dataReceived} bytes of audio data`);
        resolve(true);
      } else {
        console.log(`   ❌ Capture failed (code: ${code}, data: ${dataReceived} bytes)`);
        resolve(false);
      }
    });
    
    setTimeout(() => {
      ffmpeg.kill('SIGTERM');
      resolve(false);
    }, 5000);
  });
}

function testPlayback() {
  return new Promise((resolve) => {
    console.log('   Playing test tone for 1 second...');
    
    const ffmpeg = spawn('ffmpeg', [
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '1',
      '-i', '-',
      '-f', 'alsa',
      'default'
    ], { stdio: ['pipe', 'ignore', 'pipe'] });
    
    let hasError = false;
    
    // Generate 440Hz sine wave
    const sampleRate = 48000;
    const samples = sampleRate; // 1 second
    const buffer = Buffer.alloc(samples * 2);
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16384;
      buffer.writeInt16LE(sample, i * 2);
    }
    
    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();
    
    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.log(`   ❌ ${message.trim()}`);
        hasError = true;
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0 && !hasError) {
        console.log('   ✅ Playback test completed');
        resolve(true);
      } else {
        console.log(`   ❌ Playback failed (code: ${code})`);
        resolve(false);
      }
    });
    
    setTimeout(() => {
      ffmpeg.kill('SIGTERM');
      resolve(false);
    }, 3000);
  });
}

function testFullPipeline() {
  return new Promise((resolve) => {
    console.log('   Running capture -> playback pipeline...');
    console.log('   🔊 You should hear your microphone input for 5 seconds');
    
    // Capture process
    const capture = spawn('ffmpeg', [
      '-f', 'alsa',
      '-i', 'default',
      '-ar', '48000',
      '-ac', '1',
      '-f', 's16le',
      '-'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    
    // Playback process
    const playback = spawn('ffmpeg', [
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '1',
      '-i', '-',
      '-f', 'alsa',
      'default'
    ], { stdio: ['pipe', 'ignore', 'pipe'] });
    
    // Pipe capture output to playback input
    capture.stdout.pipe(playback.stdin);
    
    let dataCount = 0;
    capture.stdout.on('data', () => {
      dataCount++;
    });
    
    capture.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.log(`   Capture error: ${message.trim()}`);
      }
    });
    
    playback.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.log(`   Playback error: ${message.trim()}`);
      }
    });
    
    // Stop after 5 seconds
    setTimeout(() => {
      capture.kill('SIGTERM');
      playback.kill('SIGTERM');
      
      if (dataCount > 0) {
        console.log(`   ✅ Pipeline test completed (${dataCount} audio chunks processed)`);
      } else {
        console.log('   ❌ Pipeline test failed (no audio data)');
      }
      
      resolve();
    }, 5000);
  });
}

testPipeline().catch(console.error);
