export interface RadioState {
    frequency: number;
    mode: RadioMode;
    bandwidth: number;
    power: number;
    squelch: number;
    volume: number;
    antenna: number;
    ptt: boolean;
    connected: boolean;
    model: string;
    serialNumber?: string;
}
export type RadioMode = 'LSB' | 'USB' | 'CW' | 'CWR' | 'AM' | 'FM' | 'WFM' | 'RTTY' | 'RTTYR' | 'PSK' | 'PSKR' | 'FT8' | 'FT4' | 'DATA';
export interface BandInfo {
    name: string;
    start: number;
    end: number;
    modes: RadioMode[];
    defaultMode: RadioMode;
    defaultFrequency: number;
}
export interface MemoryChannel {
    number: number;
    name: string;
    frequency: number;
    mode: RadioMode;
    bandwidth: number;
    antenna: number;
    ctcss?: number;
    dcs?: number;
}
export interface RadioCapabilities {
    frequencyRange: {
        min: number;
        max: number;
    };
    modes: RadioMode[];
    maxPower: number;
    antennas: number;
    hasSpectrum: boolean;
    hasWaterfall: boolean;
    hasAudio: boolean;
    memoryChannels: number;
    bandStackRegisters: number;
}
export interface SpectrumData {
    frequencies: number[];
    levels: number[];
    centerFrequency: number;
    span: number;
    timestamp: number;
}
export interface WaterfallData {
    data: number[][];
    width: number;
    height: number;
    timestamp: number;
}
export interface AudioSettings {
    inputDevice?: string;
    outputDevice?: string;
    inputGain: number;
    outputGain: number;
    micGain: number;
    speakerVolume: number;
    enableNoiseBlanker: boolean;
    enableNoiseReduction: boolean;
    enableAGC: boolean;
    compressorLevel: number;
}
export interface RigctlCommand {
    command: string;
    parameters?: (string | number)[];
}
export interface RigctlResponse {
    success: boolean;
    data?: any;
    error?: string;
}
export type WebSocketMessage = {
    type: 'radio_state';
    data: RadioState;
} | {
    type: 'spectrum_data';
    data: SpectrumData;
} | {
    type: 'waterfall_data';
    data: WaterfallData;
} | {
    type: 'command';
    data: RigctlCommand;
} | {
    type: 'response';
    data: RigctlResponse;
} | {
    type: 'error';
    data: {
        message: string;
        code?: string;
    };
} | {
    type: 'connection_status';
    data: {
        connected: boolean;
        radio?: string;
    };
};
export interface RadioConfig {
    model: string;
    port: string;
    baudRate: number;
    rigctldHost: string;
    rigctldPort: number;
    pollInterval: number;
    audioEnabled: boolean;
    spectrumEnabled: boolean;
}
export interface AppConfig {
    radio: RadioConfig;
    audio: AudioSettings;
    ui: {
        theme: 'light' | 'dark' | 'auto';
        touchOptimized: boolean;
        showSpectrum: boolean;
        showWaterfall: boolean;
        frequencyStep: number;
    };
    network: {
        serverPort: number;
        allowRemoteConnections: boolean;
    };
}
//# sourceMappingURL=radio.d.ts.map