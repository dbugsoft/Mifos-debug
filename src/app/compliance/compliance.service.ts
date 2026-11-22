/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SILENT_ERRORS } from 'app/core/http/error-handler.interceptor';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';
import {
  AmlSettings,
  AmlSettingsView,
  CashClass,
  ComplianceAccess,
  ComplianceToday,
  GoamlCodeLists,
  GoamlLookup,
  GoamlReadiness,
  GoamlReport,
  GoamlSchemaInfo,
  LedgerStatus,
  ReportSteps,
  ReportType,
  TtrItem,
  TtrItemDetail,
  TtrStatus,
  TtrSummary
} from './compliance.models';

const NO_ACCESS: ComplianceAccess = { permissions: [], showMenu: false, holders: null };

/**
 * Anti-money-laundering compliance (fineract-dbug ADR 0036 to 0041). Compliance data is need-to-know: the backend grants
 * it only to roles that hold the compliance permissions by name (not "All functions"), so the screens ask
 * /nepal/aml/access what to show instead of reading the user's permission list, and call nothing else without it
 * (the global error handler would alert on every refused call).
 */
@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private http = inject(HttpClient);
  private access$?: Observable<ComplianceAccess>;

  private today$?: Observable<ComplianceToday | null>;

  /** The last Today answer: the Today page's list and the counts beside the Compliance menu's pages. */
  readonly todayAnswer = signal<ComplianceToday | null>(null);

  /** The last report steps answer: the Reports to FIU-Nepal steps and the counts on its tabs. */
  readonly reportSteps = signal<ReportSteps | null>(null);

  /** The last access answer, for templates. */
  readonly access = signal<ComplianceAccess>(NO_ACCESS);

  /** What this user may see; asked once per sign-in. A failure means no access. */
  loadAccess(refresh = false): Observable<ComplianceAccess> {
    if (!this.access$ || refresh) {
      this.access$ = this.http
        // a backend without compliance answers 404; that only means no menu, not an error to show
        .get<ComplianceAccess>('/nepal/aml/access', { context: new HttpContext().set(SILENT_ERRORS, true) })
        .pipe(
          catchError(() => of(NO_ACCESS)),
          tap((a) => this.access.set(a)),
          shareReplay(1)
        );
    }
    return this.access$;
  }

  /**
   * Everything waiting, asked afresh; a call already on its way is shared, so the sidebar and the page opening together
   * ask once. A failure leaves the last answer and the menu without counts.
   */
  loadToday(limit?: number): Observable<ComplianceToday | null> {
    if (limit) {
      // the whole list, for the page's "show all"; the counts are the same
      return this.http
        .get<ComplianceToday>('/nepal/aml/today', { params: { limit } })
        .pipe(tap((t) => this.todayAnswer.set(t)));
    }
    if (!this.today$) {
      this.today$ = this.http
        .get<ComplianceToday>('/nepal/aml/today', { context: new HttpContext().set(SILENT_ERRORS, true) })
        .pipe(
          tap((t) => this.todayAnswer.set(t)),
          catchError(() => of(null)),
          finalize(() => (this.today$ = undefined)),
          shareReplay(1)
        );
    }
    return this.today$;
  }

  /**
   * Where each report type stands, for the Reports to FIU-Nepal steps and tab counts (ADR-0062). A failure leaves the
   * tabs without counts.
   */
  loadReportSteps(): Observable<ReportSteps | null> {
    return this.http
      .get<ReportSteps>('/nepal/aml/today/reports', { context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(
        tap((r) => this.reportSteps.set(r)),
        catchError(() => of(null))
      );
  }

  /** Forget the answers (after signing out or in as someone else). */
  reset(): void {
    this.access$ = undefined;
    this.access.set(NO_ACCESS);
    this.todayAnswer.set(null);
    this.reportSteps.set(null);
  }

  can(...anyOf: string[]): boolean {
    const held = this.access().permissions ?? [];
    return anyOf.some((p) => held.includes(p));
  }

  settings(): Observable<AmlSettingsView> {
    return this.http.get<AmlSettingsView>('/nepal/aml/settings');
  }

  updateSettings(
    changes: Partial<AmlSettings> & { paymentClasses?: { paymentTypeId: number; cashClass: CashClass }[] }
  ): Observable<any> {
    return this.http.put('/nepal/aml/settings', changes);
  }

  ttrSummary(): Observable<TtrSummary> {
    return this.http.get<TtrSummary>('/nepal/aml/ttr/summary');
  }

  ttrItems(status?: TtrStatus | 'ALL', officeId?: number | null): Observable<TtrItem[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (officeId) {
      params = params.set('officeId', officeId);
    }
    return this.http.get<TtrItem[]>('/nepal/aml/ttr', { params });
  }

  ttrItem(id: number): Observable<TtrItemDetail> {
    return this.http.get<TtrItemDetail>(`/nepal/aml/ttr/${id}`);
  }

  decideTtr(id: number, command: 'exempt' | 'report' | 'reopen', reason?: string): Observable<TtrItem> {
    return this.http.post<TtrItem>(`/nepal/aml/ttr/${id}`, reason ? { reason } : {}, { params: { command } });
  }

  /** Reports, newest first; `status` may name several, comma separated. A page full means there is more. */
  goamlReports(
    filter: { status?: string; type?: ReportType; clientId?: number; limit?: number; offset?: number } = {}
  ): Observable<GoamlReport[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(
      ([
        k,
        v
      ]) => {
        if (v !== undefined && v !== null && v !== '') {
          params = params.set(k, v);
        }
      }
    );
    return this.http.get<GoamlReport[]>('/nepal/aml/goaml/reports', { params });
  }

  makeTtrReports(ttrItemIds: number[]): Observable<GoamlReport[]> {
    return this.http.post<GoamlReport[]>('/nepal/aml/goaml/reports', { type: 'TTR', ttrItemIds });
  }

  decideReport(
    id: number,
    command: 'regenerate' | 'submitted' | 'filed-by-hand' | 'accepted' | 'rejected' | 'correct' | 'discard',
    body: Record<string, string> = {}
  ): Observable<GoamlReport> {
    return this.http.post<GoamlReport>(`/nepal/aml/goaml/reports/${id}`, body, { params: { command } });
  }

  reportXml(id: number): Observable<Blob> {
    return this.http.get(`/nepal/aml/goaml/reports/${id}/xml`, { responseType: 'blob' });
  }

  /** A zip FIU-Nepal takes: the file with, for an STR or SAR, its case's documents. */
  reportPackage(id: number): Observable<Blob> {
    return this.http.get(`/nepal/aml/goaml/reports/${id}/package`, { responseType: 'blob' });
  }

  /** One zip of several ready threshold reports. */
  reportsPackage(reportIds: number[]): Observable<Blob> {
    return this.http.post('/nepal/aml/goaml/reports/package', { reportIds }, { responseType: 'blob' });
  }

  /** What is still missing before the first report (the goAML setup checklist). */
  goamlReadiness(): Observable<GoamlReadiness> {
    return this.http.get<GoamlReadiness>('/nepal/aml/goaml/readiness');
  }

  goamlSchema(): Observable<GoamlSchemaInfo> {
    return this.http.get<GoamlSchemaInfo>('/nepal/aml/goaml/schema');
  }

  /** Use a newer schema file from FIU-Nepal; the answer says how many ready reports went back to draft. */
  uploadGoamlSchema(label: string, xsd: string): Observable<GoamlSchemaInfo> {
    // the page says what a refused file means, in place of the usual error box
    return this.http.put<GoamlSchemaInfo>('/nepal/aml/goaml/schema', xsd, {
      params: { label },
      headers: { 'Content-Type': 'text/plain' },
      context: new HttpContext().set(SILENT_ERRORS, true)
    });
  }

  /** Go back to the schema file that ships with the system. */
  usePublishedGoamlSchema(): Observable<GoamlSchemaInfo> {
    return this.http.delete<GoamlSchemaInfo>('/nepal/aml/goaml/schema');
  }

  ledgerStatus(): Observable<LedgerStatus> {
    return this.http.get<LedgerStatus>('/nepal/aml/movements/status');
  }

  /** FIU-Nepal's codes (fineract-dbug #288; docs/goaml-reports.md, "Codes"): our rows, grouped by `type`. */
  goamlLookups(): Observable<GoamlLookup[]> {
    return this.http.get<GoamlLookup[]>('/nepal/aml/goaml/lookups');
  }

  /** For each lookup `type`, the codes the schema in use allows - `institution` has none, it is free text. */
  goamlCodeLists(): Observable<GoamlCodeLists> {
    return this.http.get<GoamlCodeLists>('/nepal/aml/goaml/code-lists');
  }

  updateGoamlLookups(rows: GoamlLookup[]): Observable<GoamlLookup[]> {
    return this.http.put<GoamlLookup[]>('/nepal/aml/goaml/lookups', rows);
  }
}
