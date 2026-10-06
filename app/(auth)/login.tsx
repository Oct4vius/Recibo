import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RansomText } from '@/components/RansomText';
import { SlantPanel } from '@/components/SlantPanel';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { angles, colors } from '@/theme/tokens';

export default function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <SlantPanel color="blood" skew={angles.backdrop} padding={28} style={{ marginBottom: 40 }}>
            <View style={{ alignItems: 'flex-start' }}>
              <RansomText text="RECIBO" animate />
            </View>
          </SlantPanel>
          <LoginForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
