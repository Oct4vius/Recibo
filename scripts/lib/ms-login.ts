// Reexportación: la construcción de URLs y PKCE vive en `src/features/accounts/loopback-login.ts`.
export { LOOPBACK_PORT, LOOPBACK_REDIRECT, openBrowser, waitForCode } from './loopback';
export {
  base64Url,
  createPkce,
  MS_AUTHORIZE_URL,
  MS_SCOPES,
  MS_TOKEN_URL,
  microsoftAuthorizeUrl as authorizeUrl,
} from '../../src/features/accounts/loopback-login';
