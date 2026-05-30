import * as React from 'react';
import { Redirect } from 'expo-router';
import { getToken } from '@/lib/secure-store';
import { View, ActivityIndicator } from 'react-native';

// Gate: if we have a token, go straight to the library. If not, login.
// We also pre-flight a /api/library call inside (tabs) so a stale token
// gets cleared and we bounce back here automatically.
export default function Index() {
  const [decided, setDecided] = React.useState<null | '/(tabs)' | '/login'>(null);

  React.useEffect(() => {
    (async () => {
      const token = await getToken();
      setDecided(token ? '/(tabs)' : '/login');
    })();
  }, []);

  if (!decided) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={decided} />;
}
