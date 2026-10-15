import { createServiceClient } from '../_shared/db.ts';
import { createUnlinkHandler } from './handler.ts';

const db = createServiceClient();

Deno.serve(
  createUnlinkHandler({
    userIdFromToken: async (token) => (await db.auth.getUser(token)).data.user?.id ?? null,
    unlink: async (userId, accountId) => {
      const { data, error } = await db.rpc('unlink_mail_account', { p_user_id: userId, p_account_id: accountId });
      if (error) throw new Error(error.message);
      return data === true;
    },
  }),
);
