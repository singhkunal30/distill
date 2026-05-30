import * as React from 'react';
import { View, Image, Text } from 'react-native';

// Deterministic color fallback when there's no cover art.
function gradientFor(title: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    from: `hsl(${hue}, 40%, 30%)`,
    to: `hsl(${(hue + 40) % 360}, 60%, 45%)`,
  };
}

export function BookCover({
  url,
  title,
  width = 96,
}: {
  url: string | null;
  title: string;
  width?: number;
}) {
  const height = Math.round(width * 1.5);
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width, height, borderRadius: 6, backgroundColor: '#d8cdb7' }}
      />
    );
  }
  const { from } = gradientFor(title);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor: from,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{ color: 'white', fontFamily: 'Georgia', fontSize: 12, textAlign: 'center' }}
        numberOfLines={4}
      >
        {title}
      </Text>
    </View>
  );
}
