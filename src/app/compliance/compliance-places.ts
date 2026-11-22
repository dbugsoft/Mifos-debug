/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CompliancePlace, ReportType } from './compliance.models';

/** Every compliance permission: Today and the officer's duties show to anyone holding one that sees counts or duties. */
const COUNTS_OR_DUTIES = [
  'READ_AMLCOMPLIANCE',
  'READ_AMLSUMMARY',
  'READ_AMLDECISIONS',
  'MANAGE_AMLGOVERNANCE'
];

/** A tab inside a place. */
export interface PlaceTab {
  /** Translation key. */
  label: string;
  path: string[];
  /** Compliance permissions, any held by name, that show the tab. */
  compliance?: string[];
  /** A Fineract permission that shows the tab instead (for a page that is not compliance data). */
  permission?: string;
  /** The report type whose waiting reports the tab counts. */
  count?: ReportType;
}

/** One place of the Compliance menu: one job of the compliance officer (fineract-dbug ADR 0060). */
export interface CompliancePlaceDef {
  /** Translation key. */
  label: string;
  /** Compliance permissions, any held by name, that show the place. */
  compliance: string[];
  tabs: PlaceTab[];
}

/** The places and the pages inside each (ADR-0060; Reports to FIU-Nepal's tabs: ADR-0062). */
export const COMPLIANCE_PLACES: Record<CompliancePlace, CompliancePlaceDef> = {
  REPORTS: {
    label: 'compliance.nav.Reports to FIU-Nepal',
    compliance: ['READ_AMLCOMPLIANCE'],
    tabs: [
      { label: 'compliance.nav.Threshold (TTR)', path: [
          '/compliance',
          'threshold-reports'
        ], count: 'TTR' },
      { label: 'compliance.nav.Suspicious transaction (STR)', path: [
          '/compliance',
          'suspicious-reports',
          'str'
        ], count: 'STR' },
      { label: 'compliance.nav.Suspicious activity (SAR)', path: [
          '/compliance',
          'suspicious-reports',
          'sar'
        ], count: 'SAR' },
      { label: 'compliance.nav.Sent and answered', path: [
          '/compliance',
          'sent-reports'
        ] },
      { label: 'compliance.nav.goAML setup', path: [
          '/compliance',
          'goaml-setup'
        ] }
    ]
  },
  SUSPICIONS: {
    label: 'compliance.nav.Suspicions',
    compliance: ['READ_AMLCOMPLIANCE'],
    tabs: [
      { label: 'compliance.nav.Alerts', path: [
          '/compliance',
          'alerts'
        ] },
      { label: 'compliance.nav.Cases', path: [
          '/compliance',
          'cases'
        ] }
    ]
  },
  MEMBERS: {
    label: 'compliance.nav.Know our members',
    compliance: ['READ_AMLCOMPLIANCE'],
    tabs: [
      { label: 'compliance.nav.Risk grades', path: [
          '/compliance',
          'risk'
        ] },
      { label: 'compliance.nav.Sanctions screening', path: [
          '/compliance',
          'screening'
        ] },
      { label: 'compliance.nav.Politically exposed persons', path: [
          '/compliance',
          'peps'
        ] },
      { label: 'compliance.nav.Occupation and area grades', path: [
          '/compliance',
          'risk-tables'
        ] }
    ]
  },
  DUTIES: {
    label: 'compliance.nav.Our own duties',
    compliance: COUNTS_OR_DUTIES,
    tabs: [
      { label: 'compliance.nav.Officer and board', path: [
          '/compliance',
          'governance'
        ] },
      {
        label: 'compliance.nav.Yearly reports',
        path: [
          '/compliance',
          'reports'
        ],
        compliance: [
          'READ_AMLCOMPLIANCE',
          'READ_AMLSUMMARY',
          'READ_AMLDECISIONS'
        ]
      },
      { label: 'compliance.nav.Elections', path: [
          '/compliance',
          'governance',
          'elections'
        ], permission: 'READ_GOVERNANCE' }
    ]
  }
};

/** Today: shown to anyone who sees counts or duties. */
export const TODAY_COMPLIANCE = COUNTS_OR_DUTIES;

/** The place a compliance URL belongs to, for the menu's highlight. */
export function placeOf(url: string): CompliancePlace | 'TODAY' | null {
  const path = url.split(/[?#]/)[0];
  if (!path.startsWith('/compliance')) {
    return null;
  }
  const first = path.split('/')[2] ?? '';
  if (first === '') {
    return 'TODAY';
  }
  if ([
      'threshold-reports',
      'suspicious-reports',
      'sent-reports',
      'goaml-setup'
    ].includes(first)) {
    return 'REPORTS';
  }
  if (first === 'alerts' || first === 'cases') {
    return 'SUSPICIONS';
  }
  if ([
      'risk',
      'members',
      'peps',
      'screening',
      'risk-tables'
    ].includes(first)) {
    return 'MEMBERS';
  }
  if (first === 'governance' || first === 'reports') {
    return 'DUTIES';
  }
  return null;
}
