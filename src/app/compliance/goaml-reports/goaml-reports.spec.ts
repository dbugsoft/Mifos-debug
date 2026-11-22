/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TranslateService } from '@ngx-translate/core';
import { GoamlGap, GoamlReport } from '../compliance.models';
import { fixLink, gapText } from './goaml-gaps.component';
import { daysUntil, onlyByHand, reportSteps } from './goaml-report-list.component';

const report = (r: Partial<GoamlReport>): GoamlReport => ({
  id: 1,
  reference: 'TTR-000001',
  type: 'TTR',
  status: 'DRAFT',
  problems: [],
  ...r
});

const gap = (code: string, args: string[] = ['Ram Thapa (000000214)']): GoamlGap => ({
  code,
  message: 'English from the server',
  arguments: args,
  fix: 'MEMBER',
  clientId: 214
});

/** A translator that knows only the keys given, filling {{a0}} and {{text}} like ngx-translate. */
function translator(known: Record<string, string>): TranslateService {
  return {
    instant: (key: string, params: Record<string, string> = {}) =>
      known[key] ? known[key].replace(/\{\{(\w+)\}\}/g, (_: string, p: string) => params[p] ?? '') : key
  } as unknown as TranslateService;
}

describe('goAML reports on screens (ADR-0062)', () => {
  describe('the steps a report allows', () => {
    it('a draft is rebuilt first, and one only the portal can take is filed by hand', () => {
      expect(reportSteps(report({ status: 'DRAFT' }))[0]).toBe('REBUILD');
      const group = report({ status: 'DRAFT', problemDetails: [gap('threshold.group.account', ['12'])] });
      expect(onlyByHand(group)).toBe(true);
      expect(reportSteps(group)).toEqual([
        'FILE_BY_HAND',
        'DISCARD'
      ]);
    });

    it('a ready report is downloaded as a zip and recorded as sent, unless its file is out of date', () => {
      expect(reportSteps(report({ status: 'READY' })).slice(0, 2)).toEqual([
        'PACKAGE',
        'SENT'
      ]);
      const stale = reportSteps(report({ status: 'READY', stale: true }));
      expect(stale[0]).toBe('REBUILD');
      expect(stale).not.toContain('SENT');
      expect(stale).not.toContain('PACKAGE');
    });

    it('after sending: the answer, then a correction; nothing for a replaced or discarded one', () => {
      expect(reportSteps(report({ status: 'SUBMITTED' }))).toEqual([
        'ACCEPTED',
        'REJECTED',
        'CORRECT'
      ]);
      expect(reportSteps(report({ status: 'REJECTED' }))).toEqual(['CORRECT']);
      expect(reportSteps(report({ status: 'ACCEPTED' }))).toEqual(['CORRECT']);
      expect(reportSteps(report({ status: 'CORRECTED' }))).toEqual([]);
      expect(reportSteps(report({ status: 'DISCARDED' }))).toEqual([]);
    });
  });

  it('counts days to a deadline from today', () => {
    const today = new Date(2026, 10, 22);
    expect(daysUntil('2026-11-24', today)).toBe(2);
    expect(daysUntil('2026-11-20', today)).toBe(-2);
    expect(daysUntil('2026-11-22', today)).toBe(0);
    expect(daysUntil(null, today)).toBeNull();
  });

  describe('problems and warnings', () => {
    const t = translator({
      'compliance.gap.member.birthdate': '{{a0}} को जन्म मिति छैन।',
      'compliance.gap.director': 'एक सञ्चालक: {{text}}'
    });

    it('are translated by code with their arguments', () => {
      expect(gapText(t, gap('member.birthdate'))).toBe('Ram Thapa (000000214) को जन्म मिति छैन।');
    });

    it("fall back to the server's English for a code the screen does not know", () => {
      expect(gapText(t, gap('member.something.new'))).toBe('English from the server');
    });

    it("say a director's gap of the director", () => {
      expect(gapText(t, gap('organisation.director.member.birthdate'))).toBe(
        'एक सञ्चालक: Ram Thapa (000000214) को जन्म मिति छैन।'
      );
    });

    it('link to where each is fixed', () => {
      expect(fixLink('MEMBER', 214)).toEqual([
        '/members',
        '214'
      ]);
      expect(fixLink('MEMBER', null)).toBeNull();
      expect(fixLink('OFFICER')).toEqual([
        '/compliance',
        'governance'
      ]);
      expect(fixLink('GOAML_CODES')).toEqual([
        '/compliance',
        'settings',
        'codes'
      ]);
      expect(fixLink('AML_SETTINGS')).toEqual([
        '/compliance',
        'settings',
        'ready'
      ]);
      expect(fixLink('NONE')).toBeNull();
    });
  });
});
