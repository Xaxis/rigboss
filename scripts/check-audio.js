#!/usr/bin/env node

import { execSync } from 'child_process';
import os from 'os';

console.log('🎵 Audio Device Detection');
console.log('========================');

const platform = os.platform();
console.log(`Platform: ${platform}`);

if (platform === 'linux') {
  console.log('\n📥 Input Devices (arecord -l):');
  try {
    const input = execSync('arecord -l', { encoding: 'utf8' });
    console.log(input);
    
    // Extract USB devices
    const usbMatch = input.match(/card (\d+).*USB/i);
    if (usbMatch) {
      console.log(`✅ Detected USB audio input: plughw:${usbMatch[1]},0`);
    } else {
      console.log('⚠️  No USB audio input detected');
    }
  } catch (e) {
    console.log('❌ arecord not available or no input devices');
  }
  
  console.log('\n📤 Output Devices (aplay -l):');
  try {
    const output = execSync('aplay -l', { encoding: 'utf8' });
    console.log(output);
    
    // Extract USB devices
    const usbMatch = output.match(/card (\d+).*USB/i);
    if (usbMatch) {
      console.log(`✅ Detected USB audio output: plughw:${usbMatch[1]},0`);
    } else {
      console.log('⚠️  No USB audio output detected');
    }
  } catch (e) {
    console.log('❌ aplay not available or no output devices');
  }
} else if (platform === 'darwin') {
  console.log('\n📱 macOS Audio Devices:');
  try {
    const devices = execSync('system_profiler SPAudioDataType', { encoding: 'utf8' });
    console.log(devices);
  } catch (e) {
    console.log('❌ Could not get audio device info');
  }
} else {
  console.log('⚠️  Audio device detection not implemented for this platform');
}

console.log('\n🔧 FFmpeg Test:');
try {
  const ffmpeg = execSync('ffmpeg -version 2>/dev/null | head -1', { encoding: 'utf8' });
  console.log(`✅ ${ffmpeg.trim()}`);
} catch (e) {
  console.log('❌ ffmpeg not available');
}

console.log('\n💡 Recommendations:');
if (platform === 'linux') {
  console.log('- Connect your radio via USB');
  console.log('- Check that USB audio appears in arecord/aplay -l');
  console.log('- Ensure user is in audio group: sudo usermod -a -G audio $USER');
} else {
  console.log('- Ensure ffmpeg is installed');
  console.log('- Check system audio preferences');
}
