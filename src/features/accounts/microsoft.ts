import { makeRedirectUri } from 'expo-auth-session';

/** Microsoft identity platform (cuentas personales y de trabajo). El canje lo hace link-account, nunca la app. */
export const MS_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};
export const MS_SCOPES = ['openid', 'email', 'offline_access', 'Mail.Read'];
/** En la build de desarrollo: recibo://auth/microsoft (registrada en Entra). */
export const MS_REDIRECT_URI = makeRedirectUri({ scheme: 'recibo', path: 'auth/microsoft' });
