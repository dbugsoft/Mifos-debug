/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from '@jest/globals';
import { Approval, Decision, Outcome, nextStep, withNulls } from './approval.service';

function decision(level: string | null, outcome: Outcome, voided = false): Partial<Decision> {
  return { id: Math.random(), level, outcome, amount: 100, ...(voided ? { voidedAt: '2026-11-20T10:00:00Z' } : {}) };
}

/** The sample's three levels with each one's latest live decision. */
function approval(decisions: Partial<Decision>[], latest: Record<string, Outcome> = {}): Approval {
  return withNulls({
    loanId: 81,
    amount: 300000,
    editable: true,
    decisions: decisions as Decision[],
    levels: [
      'MANAGER',
      'LOAN_SUB_COMMITTEE',
      'BOARD'
    ].map((code) => ({
      code,
      label: code,
      committee: code === 'MANAGER' ? null : code,
      required: code === 'LOAN_SUB_COMMITTEE',
      latest: latest[code] ? (decision(code, latest[code]) as Decision) : null,
      upToPercentOfCapital: null as number | null
    }))
  });
}

describe('nextStep', () => {
  it('asks staff to recommend first, also after their recommendation was voided', () => {
    expect(nextStep(approval([]))).toEqual({ kind: 'staff' });
    expect(nextStep(approval([decision(null, 'RECOMMEND', true)]))).toEqual({ kind: 'staff' });
  });

  it('goes up the levels while each recommends', () => {
    const step = nextStep(approval([decision(null, 'RECOMMEND')], { MANAGER: 'RECOMMEND' }));
    expect(step.kind === 'level' && step.level.code).toBe('LOAN_SUB_COMMITTEE');
  });

  it('stops once a level approves or refuses', () => {
    expect(nextStep(approval([decision(null, 'RECOMMEND')], { MANAGER: 'REFUSE' }))).toBeNull();
    expect(
      nextStep(approval([decision(null, 'RECOMMEND')], { MANAGER: 'RECOMMEND', LOAN_SUB_COMMITTEE: 'APPROVE' }))
    ).toBeNull();
  });

  it('reads left-out fields as null', () => {
    const a = approval([decision(null, 'RECOMMEND')]);
    expect(a.waitingFor).toBeNull();
    expect(a.valuationLimit).toBeNull();
    expect(a.decisions[0].meetingDecision).toBeNull();
    expect(a.decisions[0].toConfirm).toBe(false);
  });
});
