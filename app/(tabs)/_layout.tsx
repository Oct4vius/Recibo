import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { SlamTabBar } from '@/components/SlamTabBar';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <SlamTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="transactions" options={{ title: 'Movimientos', tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="budget" options={{ title: 'Presupuesto', tabBarIcon: icon('flag-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
