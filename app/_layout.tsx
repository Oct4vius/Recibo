import '../global.css';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '@/features/auth/hooks';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Anton_400Regular, Barlow_400Regular, Barlow_500Medium, BarlowCondensed_500Medium });
  const { session, loading } = useSession();
  const ready = (fontsLoaded || fontError !== null) && !loading;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  const signedIn = session !== null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.void }, animation: 'fade' }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && __DEV__}>
            <Stack.Screen name="dev/gallery" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)/login" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
