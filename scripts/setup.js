#!/usr/bin/env node

import {execSync, spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 rigboss Setup');
console.log('================');

// Detect OS
function detectOS() {
    const platform = os.platform();
    if (platform === 'linux') return 'linux';
    if (platform === 'darwin') return 'macos';
    if (platform === 'win32') return 'windows';
    return 'unknown';
}

// Install ffmpeg based on OS
function installFFmpeg() {
    const osType = detectOS();
    console.log(`📦 Installing ffmpeg for ${osType}...`);

    try {
        // Check if ffmpeg already exists
        execSync('ffmpeg -version', {stdio: 'ignore'});
        console.log('✅ ffmpeg already installed');
        return true;
    } catch {
        // ffmpeg not found, install it
    }

    try {
        switch (osType) {
            case 'linux':
                if (fs.existsSync('/usr/bin/apt-get')) {
                    console.log('Installing via apt-get...');
                    execSync('sudo apt-get update && sudo apt-get install -y ffmpeg alsa-utils', {stdio: 'inherit'});
                } else if (fs.existsSync('/usr/bin/yum')) {
                    console.log('Installing via yum...');
                    execSync('sudo yum install -y ffmpeg alsa-utils', {stdio: 'inherit'});
                } else {
                    console.log('⚠️  Please install ffmpeg manually for your Linux distribution');
                    return false;
                }
                break;

            case 'macos':
                try {
                    execSync('brew --version', {stdio: 'ignore'});
                    console.log('Installing via Homebrew...');
                    execSync('brew install ffmpeg', {stdio: 'inherit'});
                } catch {
                    console.log('⚠️  Please install Homebrew first: https://brew.sh');
                    console.log('   Then run: brew install ffmpeg');
                    return false;
                }
                break;

            case 'windows':
                console.log('⚠️  Please install ffmpeg for Windows:');
                console.log('   1. Download from https://ffmpeg.org/download.html#build-windows');
                console.log('   2. Extract and add to PATH');
                console.log('   3. Or use chocolatey: choco install ffmpeg');
                return false;

            default:
                console.log('⚠️  Unsupported OS. Please install ffmpeg manually.');
                return false;
        }

        // Verify installation
        execSync('ffmpeg -version', {stdio: 'ignore'});
        console.log('✅ ffmpeg installed successfully');
        return true;
    } catch (error) {
        console.log('❌ ffmpeg installation failed');
        console.log('   Audio streaming will be disabled');
        return false;
    }
}

// Create .env file with defaults
function createEnvFile() {
    const envPath = path.join(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
        console.log('✅ .env file already exists');
        return;
    }

    // Change this to copy .env.example
    const envContent = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with defaults');
}

// Main setup function
async function main() {
    try {
        console.log('🔧 Setting up rigboss...');

        // 1. Create .env file
        createEnvFile();

        // 2. Install ffmpeg
        const ffmpegOk = installFFmpeg();

        console.log('\n🎉 Setup Complete!');
        console.log('==================');

        if (ffmpegOk) {
            console.log('✅ All dependencies installed');
            console.log('✅ Audio streaming enabled');
        } else {
            console.log('⚠️  Audio streaming disabled (ffmpeg not available)');
            console.log('   Control features will still work');
        }

        console.log('\n📋 Next Steps:');
        console.log('1. Connect your radio via USB (CAT + Audio)');
        console.log('2. Start rigctld: rigctld -m 229 -r /dev/ttyUSB0 -s 115200');
        console.log('3. Run rigboss: npm run dev');
        console.log('4. Open http://localhost:3000 (or http://<pi-ip>:3000)');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

main();
