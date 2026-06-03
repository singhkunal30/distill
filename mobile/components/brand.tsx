import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

// Distill droplet mark. Same shape as the web wordmark.
export function Droplet({ size = 28, color = '#1a1816' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 3c5.5 7.5 9 11.5 9 16a9 9 0 1 1-18 0c0-4.5 3.5-8.5 9-16z"
        fill={color}
        opacity={0.15}
      />
      <Path
        d="M16 3c5.5 7.5 9 11.5 9 16a9 9 0 1 1-18 0c0-4.5 3.5-8.5 9-16z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M13 13.5v9.2c4 0 6-2 6-5.1 0-2.7-1.6-4.1-6-4.1z" fill={color} />
    </Svg>
  );
}
