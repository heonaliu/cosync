import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf3ea', // page background
        ink: '#2d1d0e', // primary text
        oak: '#6b5844', // secondary text
        sand: '#a0906f', // muted text, hints
        olive: '#d9cbb5', // hairline borders
        fresh: '#42bf82', // primary green — CTAs, active states
        'deep-fresh': '#227a4a', // green text on tinted bg
        sage: '#d8f0e2', // green tint
        purple: '#7e5595', // secondary — headings, avatars
        'deep-purple': '#4a2d5e',
        lilac: '#e6d5ee',
        amber: '#fedfaa', // warm accent — highlights, callouts
        'deep-amber': '#7a4a00',
        sky: '#c1cfea', // blue tint
        'deep-sky': '#2d3f6b',
        peach: '#f5d0c8', // warm accent option
      },
      borderRadius: {
        card: '14px',
        pill: '20px',
        modal: '20px',
      },
    },
  },
};

export default config;
