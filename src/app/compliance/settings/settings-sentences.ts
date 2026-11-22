/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AmlSettings } from '../compliance.models';

/** The settings tabs, grouped by the question each answers (docs/compliance-words.md, "Settings, written as sentences"). */
export type SettingsGroup = 'READY' | 'REPORT' | 'UNUSUAL' | 'MEMBERS' | 'SANCTIONS' | 'RECORDS';

/** How a value is typed. */
export type FieldKind = 'amount' | 'number' | 'percent' | 'choice' | 'switch' | 'date' | 'text';

/** What a change would have done over the last 12 months (GET /nepal/aml/settings/effect). */
export type EffectKind = 'thresholdReports' | 'unusualYearly' | 'sourceOfFunds';

export interface SentenceField {
  key: keyof AmlSettings;
  kind: FieldKind;
  /** For a choice: the values, each worded by `compliance.settings.choice.<value>`. */
  options?: string[];
  min?: number;
  max?: number;
  /** A wider box (a web address). */
  wide?: boolean;
}

/**
 * One setting as a sentence: `compliance.settings.sentence.<id>` holds the words, with `[1]`, `[2]` where the fields go,
 * so a language can put them where its word order needs. A switch has no marker: the sentence is its label.
 */
export interface Sentence {
  id: string;
  fields: SentenceField[];
  /** Why it exists, under it: `compliance.settings.why.<id>`. */
  why?: boolean;
  effect?: EffectKind;
}

export const SETTINGS_SENTENCES: Record<SettingsGroup, Sentence[]> = {
  READY: [
    { id: 'goamlEntityId', fields: [{ key: 'goamlEntityId', kind: 'text' }], why: true },
    { id: 'goamlBranchCode', fields: [{ key: 'goamlBranchCode', kind: 'text' }], why: true },
    { id: 'remittanceService', fields: [{ key: 'remittanceService', kind: 'switch' }], why: true }
  ],
  REPORT: [
    { id: 'ttrLine', fields: [{ key: 'ttrLine', kind: 'amount' }], why: true, effect: 'thresholdReports' },
    { id: 'ttrDays', fields: [{ key: 'ttrDays', kind: 'number', min: 1, max: 15 }], why: true },
    { id: 'strTargetDays', fields: [{ key: 'strTargetDays', kind: 'number', min: 1 }], why: true },
    {
      id: 'sharesCountAsCash',
      fields: [{ key: 'sharesCountAsCash', kind: 'switch' }],
      why: true,
      effect: 'thresholdReports'
    },
    {
      id: 'unknownPaymentCountsAsCash',
      fields: [{ key: 'unknownPaymentCountsAsCash', kind: 'switch' }],
      why: true,
      effect: 'thresholdReports'
    }
  ],
  UNUSUAL: [
    {
      id: 'unusualYearlyLine',
      fields: [{ key: 'unusualYearlyLine', kind: 'amount' }],
      effect: 'unusualYearly'
    },
    { id: 'yearBasis', fields: [{ key: 'yearBasis', kind: 'choice', options: [
            'FISCAL_YEAR',
            'ROLLING_12_MONTHS'
          ] }] },
    {
      id: 'structuring',
      fields: [
        { key: 'structuringBandPercent', kind: 'percent', min: 1, max: 99 },
        { key: 'structuringWindowDays', kind: 'number', min: 1 }
      ],
      why: true
    },
    { id: 'eddMonitoringLine', fields: [{ key: 'eddMonitoringLine', kind: 'amount' }] },
    { id: 'sourceOfFundsLine', fields: [{ key: 'sourceOfFundsLine', kind: 'amount' }], effect: 'sourceOfFunds' },
    { id: 'sourceOfFundsDayTotal', fields: [{ key: 'sourceOfFundsDayTotal', kind: 'switch' }] }
  ],
  MEMBERS: [
    { id: 'riskLine', fields: [{ key: 'riskLine', kind: 'amount' }] },
    { id: 'lineMeasured', fields: [{ key: 'lineMeasured', kind: 'choice', options: [
            'PER_PRODUCT',
            'COMBINED'
          ] }] },
    { id: 'atLineCountsAs', fields: [{ key: 'atLineCountsAs', kind: 'choice', options: [
            'MEDIUM',
            'HIGH'
          ] }] },
    {
      id: 'fullKymBelowLineGrade',
      fields: [{ key: 'fullKymBelowLineGrade', kind: 'choice', options: [
            'MEDIUM',
            'NORMAL'
          ] }]
    },
    { id: 'reviewYearsHigh', fields: [{ key: 'reviewYearsHigh', kind: 'number', min: 1 }] },
    { id: 'reviewYearsMedium', fields: [{ key: 'reviewYearsMedium', kind: 'number', min: 1 }] },
    { id: 'reviewYearsNormal', fields: [{ key: 'reviewYearsNormal', kind: 'number', min: 1 }] },
    { id: 'kymGateEnabled', fields: [{ key: 'kymGateEnabled', kind: 'switch' }], why: true },
    { id: 'kymGateAllFrom', fields: [{ key: 'kymGateAllFrom', kind: 'date' }], why: true },
    { id: 'changeNoticeDays', fields: [{ key: 'changeNoticeDays', kind: 'number', min: 1 }] },
    { id: 'relationshipsFromList', fields: [{ key: 'relationshipsFromList', kind: 'switch' }], why: true }
  ],
  SANCTIONS: [
    { id: 'screeningPossibleScore', fields: [{ key: 'screeningPossibleScore', kind: 'percent', min: 70, max: 99 }] },
    { id: 'screeningLikelyScore', fields: [{ key: 'screeningLikelyScore', kind: 'percent', min: 70, max: 100 }] },
    { id: 'unListUrl', fields: [{ key: 'unListUrl', kind: 'text', wide: true }], why: true }
  ],
  RECORDS: [
    { id: 'retentionYears', fields: [{ key: 'retentionYears', kind: 'number', min: 5 }] },
    { id: 'pepRetentionYears', fields: [{ key: 'pepRetentionYears', kind: 'number', min: 1 }] }
  ]
};

/** The words and fields of a sentence, in the order the translation puts them. */
export type SentencePart = { text: string } | { field: SentenceField };

export function sentenceParts(words: string, fields: SentenceField[]): SentencePart[] {
  const parts: SentencePart[] = [];
  let last = 0;
  for (const m of words.matchAll(/\[(\d)\]/g)) {
    if (m.index! > last) {
      parts.push({ text: words.slice(last, m.index) });
    }
    const field = fields[Number(m[1]) - 1];
    if (field) {
      parts.push({ field });
    }
    last = m.index! + m[0].length;
  }
  if (last < words.length) {
    parts.push({ text: words.slice(last) });
  }
  return parts;
}

/** The lowest split deposit watched: the percent of the threshold line, in rupees. */
export function structuringFloor(ttrLine: number, percent: number): number {
  return Math.round((ttrLine * percent) / 100);
}

/** The sentence a setting is in, for the changes list. */
export function sentenceOf(key: string): Sentence | undefined {
  for (const group of Object.values(SETTINGS_SENTENCES)) {
    const s = group.find((x) => x.fields.some((f) => f.key === key));
    if (s) {
      return s;
    }
  }
  return undefined;
}
