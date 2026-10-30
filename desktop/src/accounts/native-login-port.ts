import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { LoginPort } from './login-flow';

export const nativeLoginPort: LoginPort = {
  newState: () => crypto.randomUUID(),
  listen: (state) => invoke('login_listen', { state }),
  openUrl: (url) => openUrl(url),
  waitCode: () => invoke<string>('login_wait'),
  cancel: () => invoke('login_cancel'),
};
