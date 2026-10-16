import { createServiceClient } from '../_shared/db.ts';
import { revokeGoogleToken } from '../_shared/mail/google-auth.ts';
import { createUnlinkHandler } from './handler.ts';

const db = createServiceClient();

Deno.serve(
  createUnlinkHandler({
    userIdFromToken: async (token) => (await db.auth.getUser(token)).data.user?.id ?? null,
    findAccount: async (userId, accountId) => {
      const { data, error } = await db
        .from('linked_accounts')
        .select('provider')
        .eq('id', accountId)
        .eq('user_id', userId)
        .neq('status', 'revoked')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    readToken: async (accountId) => {
      const { data, error } = await db.rpc('mail_account_token', { p_account_id: accountId });
      if (error) throw new Error(error.message);
      return (data as string | null) ?? null;
    },
    revokers: { gmail: (token) => revokeGoogleToken(token) },
    unlink: async (userId, accountId) => {
      const { data, error } = await db.rpc('unlink_mail_account', { p_user_id: userId, p_account_id: accountId });
      if (error) throw new Error(error.message);
      return data === true;
    },
  }),
);
