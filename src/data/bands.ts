import type { BandInfo } from '@/types/radio';

export const amateurBands: BandInfo[] = [
  {
    name: '160m',
    start: 1800000,
    end: 2000000,
    modes: ['LSB', 'CW', 'DATA'],
    defaultMode: 'LSB',
    defaultFrequency: 1840000,
  },
  {
    name: '80m',
    start: 3500000,
    end: 4000000,
    modes: ['LSB', 'CW', 'DATA', 'AM'],
    defaultMode: 'LSB',
    defaultFrequency: 3750000,
  },
  {
    name: '60m',
    start: 5330500,
    end: 5406500,
    modes: ['USB', 'CW', 'DATA'],
    defaultMode: 'USB',
    defaultFrequency: 5371500,
  },
  {
    name: '40m',
    start: 7000000,
    end: 7300000,
    modes: ['LSB', 'CW', 'DATA'],
    defaultMode: 'LSB',
    defaultFrequency: 7150000,
  },
  {
    name: '30m',
    start: 10100000,
    end: 10150000,
    modes: ['CW', 'DATA'],
    defaultMode: 'CW',
    defaultFrequency: 10125000,
  },
  {
    name: '20m',
    start: 14000000,
    end: 14350000,
    modes: ['USB', 'CW', 'DATA'],
    defaultMode: 'USB',
    defaultFrequency: 14200000,
  },
  {
    name: '17m',
    start: 18068000,
    end: 18168000,
    modes: ['USB', 'CW', 'DATA'],
    defaultMode: 'USB',
    defaultFrequency: 18118000,
  },
  {
    name: '15m',
    start: 21000000,
    end: 21450000,
    modes: ['USB', 'CW', 'DATA'],
    defaultMode: 'USB',
    defaultFrequency: 21225000,
  },
  {
    name: '12m',
    start: 24890000,
    end: 24990000,
    modes: ['USB', 'CW', 'DATA'],
    defaultMode: 'USB',
    defaultFrequency: 24940000,
  },
  {
    name: '10m',
    start: 28000000,
    end: 29700000,
    modes: ['USB', 'CW', 'DATA', 'FM'],
    defaultMode: 'USB',
    defaultFrequency: 28400000,
  },
  {
    name: '6m',
    start: 50000000,
    end: 54000000,
    modes: ['USB', 'CW', 'DATA', 'FM'],
    defaultMode: 'USB',
    defaultFrequency: 50125000,
  },
  {
    name: '2m',
    start: 144000000,
    end: 148000000,
    modes: ['USB', 'CW', 'DATA', 'FM'],
    defaultMode: 'FM',
    defaultFrequency: 146000000,
  },
  {
    name: '70cm',
    start: 420000000,
    end: 450000000,
    modes: ['USB', 'CW', 'DATA', 'FM'],
    defaultMode: 'FM',
    defaultFrequency: 435000000,
  },
];

export const getBandForFrequency = (frequency: number): BandInfo | null => {
  return amateurBands.find(band => 
    frequency >= band.start && frequency <= band.end
  ) || null;
};

export const getRecommendedModeForFrequency = (frequency: number): string => {
  const band = getBandForFrequency(frequency);
  if (!band) return 'USB';
  
  // Below 10 MHz typically use LSB, above use USB
  if (frequency < 10000000) {
    return band.modes.includes('LSB') ? 'LSB' : band.defaultMode;
  } else {
    return band.modes.includes('USB') ? 'USB' : band.defaultMode;
  }
};
