/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { SILENT_ERRORS } from 'app/core/http/error-handler.interceptor';

export type Security = 'ANY' | 'DEPOSIT' | 'LAND' | 'OTHER_COLLATERAL' | 'GUARANTORS';
export const SECURITIES: Security[] = [
  'ANY',
  'DEPOSIT',
  'LAND',
  'OTHER_COLLATERAL',
  'GUARANTORS'
];

export interface PolicyDocument {
  code: string;
  label: string;
  appliesTo: Security[];
  required: boolean;
}

export interface PolicyArea {
  code: string;
  label: string;
  good: number;
  ok: number;
  weak: number;
  lines: { code: string; label: string }[];
}

export interface PolicyBand {
  from: number;
  lendPercentOfCost: number | null;
  needsLand: boolean;
}

export interface PolicyLevel {
  code: string;
  label: string;
  upToPercentOfCapital: number;
  /** A governance committee code; null for a person (the Manager). */
  committee: string | null;
}

/** The cooperative's loan policy (fineract-dbug docs/lending.md, "The loan policy"). */
export interface LendingPolicy {
  fileRequiredForApproval: boolean;
  documents: PolicyDocument[];
  appraisal: {
    requiredFor: Security[];
    minOwnInvestmentPercent: number;
    areas: PolicyArea[];
    bands: PolicyBand[];
  };
  valuation: {
    marginPercent: number;
    tenancyDeductionPercent: number;
    registeredValuerFrom: number;
    holdUpTo: number;
  };
  approval: {
    required: boolean;
    recommenderMayApprove: boolean;
    insiderLevel: string | null;
    depositManagerLimit: number | null;
    depositPercent: number | null;
    levels: PolicyLevel[];
  };
}

export interface PolicyVersion {
  id: number;
  version: number;
  effectiveFrom: string;
  note: string | null;
  createdBy: number | null;
  createdAt: string | null;
  policy: LendingPolicy;
}

export interface PolicyView {
  /** The saved version in force today; null until the cooperative has one. */
  inForce: PolicyVersion | null;
  /** What applies now: the version in force, or the sample. */
  policy: LendingPolicy;
  sample: LendingPolicy;
  versions: PolicyVersion[];
}

@Injectable({ providedIn: 'root' })
export class LendingPolicyService {
  private http = inject(HttpClient);

  get(): Observable<PolicyView> {
    return this.http.get<Partial<PolicyView>>('/nepal/lending/policy').pipe(
      map((v) => ({
        inForce: v.inForce ?? null,
        policy: v.policy,
        sample: v.sample,
        versions: v.versions ?? []
      }))
    );
  }

  /** Saves a new version; versions are never changed. `effectiveFrom` is AD, yyyy-MM-dd. */
  save(effectiveFrom: string, note: string, policy: LendingPolicy): Observable<unknown> {
    return this.http.post('/nepal/lending/policy', { effectiveFrom, note, policy });
  }

  /** Staff names by user id, for "who saved"; empty when the user may not list users. */
  userNames(): Observable<Map<number, string>> {
    const context = new HttpContext().set(SILENT_ERRORS, true);
    return this.http
      .get<{ id: number; username: string; firstname?: string; lastname?: string }[]>('/users', { context })
      .pipe(
        map(
          (users) =>
            new Map(
              (users ?? []).map((u) => [
                u.id,
                [
                  u.firstname,
                  u.lastname
                ]
                  .filter(Boolean)
                  .join(' ') || u.username
              ])
            )
        ),
        catchError(() => of(new Map<number, string>()))
      );
  }
}

/**
 * What changed between two policies, one plain line each ("Documents › TRACE_MAP › required: true → false").
 * Lists are keyed by their items' codes so a reorder or an edit reads as what it is.
 */
export function policyChanges(before: unknown, after: unknown): string[] {
  const a = flatten(before);
  const b = flatten(after);
  const changes: string[] = [];
  for (const key of new Set([
    ...a.keys(),
    ...b.keys()
  ])) {
    // A field the backend left out and one set to null are the same.
    const was = a.get(key) ?? null;
    const now = b.get(key) ?? null;
    // The order is worth a line only for a pure reorder: an added or removed item has its own lines.
    const sameItems = (x: string, y: string) => x.split(', ').sort().join() === y.split(', ').sort().join();
    if (key.endsWith(' › order') && was && now && !sameItems(was, now)) {
      continue;
    }
    if (was !== now) {
      changes.push(`${key}: ${was ?? '—'} → ${now ?? '—'}`);
    }
  }
  return changes;
}

function flatten(value: unknown, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(value)) {
    const coded = value.every((v) => v && typeof v === 'object' && 'code' in v);
    if (coded) {
      out.set(`${prefix} › order`, value.map((v) => v.code).join(', '));
      value.forEach((v) => flatten(v, `${prefix} › ${v.code}`, out));
    } else if (value.every((v) => v === null || typeof v !== 'object')) {
      out.set(prefix, [...value].sort().join(', '));
    } else {
      value.forEach((v, i) => flatten(v, `${prefix} › ${i + 1}`, out));
    }
  } else if (value && typeof value === 'object') {
    for (const [
      k,
      v
    ] of Object.entries(value)) {
      if (k !== 'code') {
        flatten(v, prefix ? `${prefix} › ${k}` : k, out);
      }
    }
  } else {
    out.set(prefix, value == null ? null : String(value));
  }
  return out;
}
