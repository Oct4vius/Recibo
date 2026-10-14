import { createServiceClient } from '../_shared/db.ts';
import { exchangeCode } from '../_shared/mail/microsoft-auth.ts';
import { createLinkHandler } from './handler.ts';

const db = createServiceClient();
const clientId = Deno.env.get('MS_CLIENT_ID');
if (!clientId) throw new Error('missing MS_CLIENT_ID');

Deno.serve(
  createLinkHandler({
    userIdFromToken: async (token) => (await db.auth.getUser(token)).data.user?.id ?? null,
    exchangeCode: (input) => exchangeCode({ clientId, ...input }),
    linkAccount: async (userId, email, refreshToken) => {
      const { data, error } = await db.rpc('link_mail_account', {
        p_user_id: userId,
        p_provider: 'outlook',
        p_email: email,
        p_refresh_token: refreshToken,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
  }),
);
