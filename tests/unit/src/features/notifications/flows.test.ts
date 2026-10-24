import { describe, expect, it } from 'vitest';
import {
  checkBudgetAlerts,
  disableDeviceAlerts,
  enableDeviceAlerts,
  cleanupWithoutSession,
  ensureTaskRegistered,
  saveAlertThresholds,
  sessionState,
  type AlertsPort,
} from '@/features/notifications/flows';
import type { ClaimedAlert } from '@/features/notifications/mapping';
import type { PermissionState } from '@/features/notifications/state';

interface FakeOptions {
  session?: boolean;
  enabled?: boolean;
  permission?: PermissionState;
  requested?: PermissionState;
  claimed?: ClaimedAlert[];
  silenceFails?: boolean;
  unregisterFails?: boolean;
}

function fakePort(options: FakeOptions = {}): AlertsPort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    hasSession: async () => {
      calls.push('hasSession');
      return options.session ?? true;
    },
    readEnabled: async () => {
      calls.push('readEnabled');
      return options.enabled ?? true;
    },
    writeEnabled: async (on) => {
      calls.push(`writeEnabled:${on}`);
    },
    readPermission: async () => {
      calls.push('readPermission');
      return options.permission ?? 'granted';
    },
    requestPermission: async () => {
      calls.push('requestPermission');
      return options.requested ?? 'granted';
    },
    claim: async () => {
      calls.push('claim');
      return options.claimed ?? [];
    },
    silence: async () => {
      calls.push('silence');
      if (options.silenceFails) throw new Error('offline');
    },
    present: async (alert) => {
      calls.push(`present:${alert.period}:${alert.threshold}`);
    },
    registerTask: async () => {
      calls.push('registerTask');
    },
    unregisterTask: async () => {
      calls.push('unregisterTask');
      if (options.unregisterFails) throw new Error('task manager unavailable');
    },
    dismissAll: async () => {
      calls.push('dismissAll');
    },
  };
}

describe('checkBudgetAlerts', () => {
  it('does not claim without a session', async () => {
    const port = fakePort({ session: false });
    expect(await checkBudgetAlerts(port)).toBe(0);
    expect(port.calls).not.toContain('claim');
  });
  it('does not claim with the preference off', async () => {
    const port = fakePort({ enabled: false });
    expect(await checkBudgetAlerts(port)).toBe(0);
    expect(port.calls).not.toContain('claim');
  });
  it('does not claim without permission', async () => {
    const port = fakePort({ permission: 'denied' });
    expect(await checkBudgetAlerts(port)).toBe(0);
    expect(port.calls).not.toContain('claim');
  });
  it('presents one notification per claimed row, in order', async () => {
    const port = fakePort({
      claimed: [
        { period: 'week', threshold: 100 },
        { period: 'month', threshold: 80 },
      ],
    });
    expect(await checkBudgetAlerts(port)).toBe(2);
    expect(port.calls.filter((c) => c.startsWith('present'))).toEqual(['present:week:100', 'present:month:80']);
  });
});

describe('enableDeviceAlerts', () => {
  it('stops at a denied permission', async () => {
    const port = fakePort({ requested: 'denied' });
    expect(await enableDeviceAlerts(port)).toBe('denied');
    expect(port.calls).toEqual(['requestPermission']);
  });
  it('silences, saves the preference and registers the task, in that order', async () => {
    const port = fakePort();
    expect(await enableDeviceAlerts(port)).toBe('granted');
    expect(port.calls).toEqual(['requestPermission', 'silence', 'writeEnabled:true', 'registerTask']);
  });
  it('enables nothing when silencing fails (offline)', async () => {
    const port = fakePort({ silenceFails: true });
    await expect(enableDeviceAlerts(port)).rejects.toThrow();
    expect(port.calls).toEqual(['requestPermission', 'silence']);
  });
});

describe('disableDeviceAlerts', () => {
  it('regression — still clears the tray when cancelling the task fails', async () => {
    const port = fakePort({ unregisterFails: true });
    await expect(disableDeviceAlerts(port)).rejects.toThrow();
    expect(port.calls).toContain('dismissAll');
  });

  it('clears the preference before cancelling the task', async () => {
    const port = fakePort();
    await disableDeviceAlerts(port);
    expect(port.calls).toEqual(['writeEnabled:false', 'unregisterTask', 'dismissAll']);
  });
});

describe('ensureTaskRegistered', () => {
  it('registers when enabled and granted', async () => {
    const port = fakePort();
    await ensureTaskRegistered(port);
    expect(port.calls).toContain('registerTask');
  });
  it('does nothing when the permission was revoked', async () => {
    const port = fakePort({ permission: 'denied' });
    await ensureTaskRegistered(port);
    expect(port.calls).not.toContain('registerTask');
  });
  it('does nothing when the preference is off', async () => {
    const port = fakePort({ enabled: false });
    await ensureTaskRegistered(port);
    expect(port.calls).not.toContain('registerTask');
  });
});

describe('saveAlertThresholds', () => {
  function deps(silenceFails = false) {
    const calls: string[] = [];
    return {
      calls,
      silence: async () => {
        calls.push('silence');
        if (silenceFails) throw new Error('offline');
      },
      save: async (thresholds: number[]) => {
        calls.push(`save:${thresholds.join(',')}`);
      },
    };
  }
  it('silences before saving when a threshold is turned on', async () => {
    const d = deps();
    await saveAlertThresholds(d, [80, 100], true);
    expect(d.calls).toEqual(['silence', 'save:80,100']);
  });
  it('only saves when a threshold is turned off', async () => {
    const d = deps();
    await saveAlertThresholds(d, [100], false);
    expect(d.calls).toEqual(['save:100']);
  });
  it('does not save when silencing fails', async () => {
    const d = deps(true);
    await expect(saveAlertThresholds(d, [80], true)).rejects.toThrow();
    expect(d.calls).toEqual(['silence']);
  });
});

describe('regression — task registration follows session, preference and permission', () => {
  it('unregisters when the preference is off', async () => {
    const port = fakePort({ enabled: false });
    await ensureTaskRegistered(port);
    expect(port.calls).toContain('unregisterTask');
    expect(port.calls).not.toContain('registerTask');
  });
  it('unregisters when there is no session (sign-out race)', async () => {
    const port = fakePort({ session: false });
    await ensureTaskRegistered(port);
    expect(port.calls).toContain('unregisterTask');
    expect(port.calls).not.toContain('registerTask');
  });
  it('unregisters when the permission was revoked', async () => {
    const port = fakePort({ permission: 'denied' });
    await ensureTaskRegistered(port);
    expect(port.calls).toContain('unregisterTask');
  });
  it('does not unregister when everything is on', async () => {
    const port = fakePort();
    await ensureTaskRegistered(port);
    expect(port.calls).not.toContain('unregisterTask');
  });
});

describe('cleanupWithoutSession', () => {
  it('clears the preference and the task when the app starts without a session', async () => {
    const port = fakePort();
    await cleanupWithoutSession('absent', port);
    expect(port.calls).toEqual(['writeEnabled:false', 'unregisterTask', 'dismissAll']);
  });
  it('does nothing with a session', async () => {
    const port = fakePort();
    await cleanupWithoutSession('present', port);
    expect(port.calls).toEqual([]);
  });
});

describe('regression — a getSession error does not wipe the device alerts preference', () => {
  it('unknown session state makes no calls', async () => {
    const port = fakePort();
    await cleanupWithoutSession('unknown', port);
    expect(port.calls).toEqual([]);
  });
  it('sessionState maps the getSession result', () => {
    expect(sessionState({ session: null, error: new Error('storage') })).toBe('unknown');
    expect(sessionState({ session: null, error: null })).toBe('absent');
    expect(sessionState({ session: {}, error: null })).toBe('present');
  });
});
