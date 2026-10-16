import { createServiceClient } from '../_shared/db.ts';
import { gmailExchanger, outlookExchanger } from './exchangers.ts';
import { createLinkHandler } from './handler.ts';

const db = createServiceClient();
const msClientId = Deno.env.get('MS_CLIENT_ID');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
if (!msClientId || !googleClientId || !googleClientSecret) {
  throw new Error('missing MS_CLIENT_ID, GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

Deno.serve(
  createLinkHandler({
    userIdFromToken: async (token) => (await db.auth.getUser(token)).data.user?.id ?? null,
    exchangers: {
      outlook: outlookExchanger(msClientId),
      gmail: gmailExchanger({ clientId: googleClientId, clientSecret: googleClientSecret }),
    },
    linkAccount: async (userId, provider, email, refreshToken) => {
      const { data, error } = await db.rpc('link_mail_account', {
        p_user_id: userId,
        p_provider: provider,
        p_email: email,
        p_refresh_token: refreshToken,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
  }),
);
