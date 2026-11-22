/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TranslateService } from '@ngx-translate/core';
import { changeLine } from './settings-changes.component';
import { SETTINGS_SENTENCES, SentenceField, sentenceOf, sentenceParts, structuringFloor } from './settings-sentences';

const WORDS: Record<string, string> = {
  'compliance.settings.sentence.ttrLine': "Report a member's cash of [1] or more in one day, in or out.",
  'compliance.settings.sentence.structuring':
    'Watch for deposits split to stay under the threshold: each from [1] of the line, over [2] days.',
  'compliance.settings.sentence.kymGateEnabled': "Stop money going out while a member's KYM is incomplete.",
  'compliance.settings.sentence.atLineCountsAs': 'A member exactly at the line is [1].',
  'compliance.settings.choice.HIGH': 'high risk',
  'compliance.settings.on': 'on',
  'compliance.settings.off': 'off',
  'compliance.settings.empty': '(empty)'
};
const translate = { instant: (k: string) => WORDS[k] ?? k } as unknown as TranslateService;

describe('Compliance settings as sentences (ADR-0063)', () => {
  describe('sentenceParts', () => {
    const a: SentenceField = { key: 'structuringBandPercent', kind: 'percent' };
    const b: SentenceField = { key: 'structuringWindowDays', kind: 'number' };

    it('puts each field where its marker is', () => {
      const parts = sentenceParts('Each from [1] of the line, over [2] days.', [
        a,
        b
      ]);
      expect(parts).toEqual([
        { text: 'Each from ' },
        { field: a },
        { text: ' of the line, over ' },
        { field: b },
        { text: ' days.' }
      ]);
    });

    it('follows the order a language puts the markers in', () => {
      const parts = sentenceParts('[2] दिनभित्र, सीमाको [1] देखि', [
        a,
        b
      ]);
      expect(parts[0]).toEqual({ field: b });
      expect(parts[2]).toEqual({ field: a });
    });

    it('keeps a sentence without markers as words', () => {
      expect(sentenceParts('We run a remittance service.', [])).toEqual([{ text: 'We run a remittance service.' }]);
    });

    it('drops a marker with no field rather than failing', () => {
      expect(sentenceParts('A [3] B', [a])).toEqual([
        { text: 'A ' },
        { text: ' B' }
      ]);
    });
  });

  it('works out the lowest split deposit watched', () => {
    expect(structuringFloor(1000000, 90)).toBe(900000);
    expect(structuringFloor(1000000, 33)).toBe(330000);
  });

  it('finds the sentence of every setting, each setting once', () => {
    const keys = Object.values(SETTINGS_SENTENCES)
      .flat()
      .flatMap((s) => s.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(sentenceOf('structuringWindowDays')?.id).toBe('structuring');
    expect(sentenceOf('secondApproverAbove')).toBeUndefined();
  });

  describe('a change reads as the rule it set', () => {
    it('with the amount in place', () => {
      expect(changeLine(translate, 'ttrLine', '900000')).toBe(
        "Report a member's cash of Rs 9,00,000 or more in one day, in or out."
      );
    });

    it('with only the changed field filled in a two-field sentence', () => {
      expect(changeLine(translate, 'structuringWindowDays', '5')).toBe(
        'Watch for deposits split to stay under the threshold: each from … of the line, over 5 days.'
      );
    });

    it('with a choice in words', () => {
      expect(changeLine(translate, 'atLineCountsAs', 'HIGH')).toBe('A member exactly at the line is high risk.');
    });

    it('with a switch on or off', () => {
      expect(changeLine(translate, 'kymGateEnabled', 'false')).toBe(
        "Stop money going out while a member's KYM is incomplete. (off)"
      );
    });

    it('as name and value for a setting with no sentence', () => {
      expect(changeLine(translate, 'secondApproverAbove', null)).toBe('secondApproverAbove: —');
    });
  });
});
