import { supabase } from '@/lib/supabase';
import { functionErrorMessage } from './errors';
import { toLinkedAccount, type LinkedAccount } from './mapping';

export async function fetchLinkedAccounts(): Promise<LinkedAccount[]> {
  const { data, error } = await supabase
    .from('linked_accounts')
    .select('id, provider, email, status, last_sync_at, last_error')
    .order('created_at');
  if (error) throw error;
  return data.map(toLinkedAccount);
}

export interface LinkOutlookInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/** Envía el código PKCE a link-account; la app nunca canjea el código ni ve tokens. */
export async function linkOutlook(input: LinkOutlookInput): Promise<void> {
  const { error } = await supabase.functions.invoke('link-account', { body: { provider: 'outlook', ...input } });
  if (error) throw new Error(await functionErrorMessage(error));
}

export async function unlinkAccount(accountId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('unlink-account', { body: { accountId } });
  if (error) throw new Error(await functionErrorMessage(error));
}
