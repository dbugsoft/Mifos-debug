/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { TenantRemediationReport } from '../services/coop-admin.service';
import {
  accessEmailSummary,
  activationBanner,
  remediationActionLabel,
  remediationChangesAccess
} from './tenant-access.util';

describe('tenant access helpers', () => {
  describe('activationBanner', () => {
    it('is a success when the email was sent', () => {
      expect(activationBanner('SENT')).toEqual(expect.objectContaining({ kind: 'success' }));
    });

    it('warns when the email failed', () => {
      expect(activationBanner('FAILED')).toEqual(expect.objectContaining({ kind: 'warning' }));
    });

    it('warns and never suggests sharing a password when mail is not configured', () => {
      const banner = activationBanner('NOT_CONFIGURED');

      expect(banner.kind).toBe('warning');
      expect(banner.detail).toContain('Never share a password');
    });
  });

  describe('accessEmailSummary', () => {
    const format = (iso: string) => `on ${iso}`;

    it('describes each status', () => {
      expect(accessEmailSummary({ accessEmailStatus: 'SENT', accessEmailSentAt: 'T1' }, format)).toBe('Sent on T1');
      expect(accessEmailSummary({ accessEmailStatus: 'FAILED', accessEmailLastAttemptAt: 'T2' }, format)).toBe(
        'Failed on T2'
      );
      expect(accessEmailSummary({ accessEmailStatus: 'NOT_CONFIGURED' }, format)).toContain('not configured');
      expect(accessEmailSummary({}, format)).toBe('Not sent yet');
    });
  });

  describe('remediation', () => {
    const report = (administrator: string, interopUser: string): TenantRemediationReport =>
      ({
        tenantIdentifier: '2079saji0009',
        dryRun: true,
        administrator: { action: administrator, username: 'sajilo.admin.k7m2' },
        system: { action: 'REPLACE_PASSWORD' },
        interopUser: { action: interopUser },
        emailsCooperative: false
      }) as TenantRemediationReport;

    it('names the new username when renaming', () => {
      expect(remediationActionLabel('HARDEN_AND_RENAME', 'sajilo.admin.k7m2')).toContain('sajilo.admin.k7m2');
    });

    it('reports whether cooperative-facing accounts would change', () => {
      expect(remediationChangesAccess(report('HARDEN_AND_RENAME', 'DISABLE'))).toBe(true);
      expect(remediationChangesAccess(report('LEAVE_UNCHANGED', 'NOT_PRESENT'))).toBe(false);
    });
  });
});
