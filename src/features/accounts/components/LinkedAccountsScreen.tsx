import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { Screen } from '@/components/Screen';
import { SkewRow } from '@/components/SkewRow';
import { colors, fonts, typeScale } from '@/theme/tokens';
import { useLinkedAccounts } from '../hooks';
import type { LinkedAccount } from '../mapping';
import { accountStatusText } from '../sync-time';
import { AccountSheet } from './AccountSheet';
import { LinkOutlookButton } from './LinkOutlookButton';

const messageStyle = { fontFamily: fonts.body, fontSize: typeScale.body, color: colors.ash, marginVertical: 8 } as const;

/** Cuentas de correo vinculadas: estado, última sincronización, vincular Outlook y desvincular. */
export function LinkedAccountsScreen() {
  const accounts = useLinkedAccounts();
  const [selected, setSelected] = useState<LinkedAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const now = new Date();
  const refresh = () => {
    setPulling(true);
    accounts.refetch().finally(() => setPulling(false));
  };
  return (
    <>
      <Screen
        title="CUENTAS"
        backdrop={4}
        aboveTitle={<BackButton />}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.blood]} progressBackgroundColor={colors.panel} />}
      >
        {accounts.isPending ? <PlaceholderRows count={2} /> : null}
        {accounts.isError ? <Text style={{ ...messageStyle, color: colors.signal }}>No se pudieron cargar tus cuentas.</Text> : null}
        {accounts.isSuccess && accounts.data.length === 0 ? <Text style={messageStyle}>Aún no vinculas ninguna cuenta.</Text> : null}
        {(accounts.data ?? []).map((account) => (
          <SkewRow
            key={account.id}
            title={account.email}
            subtitle={accountStatusText(account, now)}
            muted={account.status === 'revoked'}
            onPress={account.status === 'revoked' ? undefined : () => setSelected(account)}
          />
        ))}
        <View style={{ marginTop: 12 }}>
          <LinkOutlookButton onMessage={setMessage} />
        </View>
        {message ? (
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.signal, marginTop: 8 }}>
            {message}
          </Text>
        ) : null}
        <SkewRow title="Gmail" subtitle="Próximamente" muted />
      </Screen>
      <AccountSheet account={selected} onClose={() => setSelected(null)} />
    </>
  );
}
