import * as React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewTab() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-background-dark' : 'bg-background'}`}
      edges={['top']}
    >
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="flash-outline" size={32} color={dark ? '#f0a634' : '#11161f'} />
        <Text
          className={`mt-3 font-serif text-2xl font-semibold ${dark ? 'text-foreground-dark' : 'text-foreground'}`}
        >
          Daily review
        </Text>
        <Text
          className={`mt-2 text-center text-sm ${dark ? 'text-mutedForeground-dark' : 'text-mutedForeground'}`}
        >
          Coming in the next pass. The web review screen at /review already works against the
          same backend — flashcards reviewed there sync immediately.
        </Text>
      </View>
    </SafeAreaView>
  );
}
