/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type {
  AccessEmailStatus,
  CoopAdminRegistration,
  RemediationAction,
  TenantRemediationReport
} from '../services/coop-admin.service';

/*
 * Pure presentation helpers for the tenant access handover screens,
 * kept out of the component so the wording and decisions are testable.
 */

export interface AccessBanner {
  kind: 'success' | 'warning';
  title: string;
  detail: string;
}

/** What to tell the admin after activation, based on whether the sign-in email went out. */
export function activationBanner(status: AccessEmailStatus | undefined): AccessBanner {
  switch (status) {
    case 'FAILED':
      return {
        kind: 'warning',
        title: 'Tenant activated, but the sign-in email could not be sent.',
        detail: 'The server may need its mail settings checked. Use "Resend sign-in email" once that is fixed.'
      };
    case 'NOT_CONFIGURED':
      return {
        kind: 'warning',
        title: 'Tenant activated, but email is not configured on the server, so nothing was sent.',
        detail:
          'Share the web address and username below with the cooperative through a trusted channel. Never share a password.'
      };
    case 'SENT':
      return {
        kind: 'success',
        title: 'Tenant activated.',
        detail: 'Sign-in details were emailed to the cooperative.'
      };
    default:
      return { kind: 'success', title: 'Tenant activated.', detail: '' };
  }
}

/** One-line summary of the most recent sign-in email for the ACTIVE card. */
export function accessEmailSummary(
  cooperative: Pick<CoopAdminRegistration, 'accessEmailStatus' | 'accessEmailSentAt' | 'accessEmailLastAttemptAt'>,
  formatDate: (iso: string) => string
): string {
  switch (cooperative.accessEmailStatus) {
    case 'SENT':
      return cooperative.accessEmailSentAt ? `Sent ${formatDate(cooperative.accessEmailSentAt)}` : 'Sent';
    case 'FAILED':
      return cooperative.accessEmailLastAttemptAt
        ? `Failed ${formatDate(cooperative.accessEmailLastAttemptAt)}`
        : 'Failed';
    case 'NOT_CONFIGURED':
      return 'Not sent (email is not configured on the server)';
    default:
      return 'Not sent yet';
  }
}

export function remediationActionLabel(action: RemediationAction, username?: string): string {
  switch (action) {
    case 'HARDEN_AND_RENAME':
      return `Rename to ${username ?? 'the managed username'}, replace the default password, disable until handed over`;
    case 'HARDEN':
      return 'Replace the default password, disable until handed over';
    case 'REPLACE_PASSWORD':
      return 'Replace the default password; exempt from password expiry';
    case 'ENSURE_NEVER_EXPIRES':
      return 'Password already changed; exempt from password expiry';
    case 'DISABLE':
      return 'Replace the default password, disable, remove roles';
    case 'LEAVE_UNCHANGED':
      return 'No change: the cooperative already changed this password';
    case 'NOT_PRESENT':
      return 'Not present';
    default:
      return action;
  }
}

/** True when applying remediation would change the cooperative's administrator or interoperation account. */
export function remediationChangesAccess(report: TenantRemediationReport): boolean {
  const unchanged: RemediationAction[] = [
    'LEAVE_UNCHANGED',
    'NOT_PRESENT'
  ];

  return !unchanged.includes(report.administrator.action) || !unchanged.includes(report.interopUser.action);
}
