/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, switchMap } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlCodeLists, GoamlLookup } from '../compliance.models';

/** `institution` (NAME, CODE) has no schema list - free text instead of a select (docs/goaml-reports.md). */
const GOAML_INSTITUTION_TYPE = 'institution';

/** A lookup type narrow enough to share a row with the one right before it, keyed by that type. */
const GOAML_ROW_PARTNER: Record<string, string> = {
  contact_type: 'communication_type',
  currency: 'country'
};

/**
 * Compliance › Settings › goAML codes (fineract-dbug #288, ADR-0063): the FIU-Nepal code for each of our values a report
 * uses. Read-only without UPDATE_AMLSETTINGS.
 */
@Component({
  selector: 'mifosx-goaml-codes',
  templateUrl: './goaml-codes.component.html',
  styleUrls: ['./goaml-codes.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoamlCodesComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly canEdit = signal(false);
  // ---- FIU-Nepal's codes (fineract-dbug #288; docs/goaml-reports.md, "Codes")

  readonly goamlLookups = signal<GoamlLookup[]>([]);
  readonly goamlCodeLists = signal<GoamlCodeLists>({});
  readonly savingCodes = signal(false);
  /** `type::ourValue` to the code being edited, so two types never share one row by chance. */
  goamlCodes: Record<string, string> = {};

  readonly goamlGroups = computed(() => {
    const groups = new Map<string, GoamlLookup[]>();
    for (const row of this.goamlLookups()) {
      const rows = groups.get(row.type) ?? [];
      rows.push(row);
      groups.set(row.type, rows);
    }
    return Array.from(groups.entries()).map(
      ([
        type,
        rows
      ]) => ({ type, rows })
    );
  });

  /** `goamlGroups()`, two to a row where `GOAML_ROW_PARTNER` says so; one to a row otherwise. */
  readonly goamlGroupRows = computed(() => {
    const rows: { type: string; rows: GoamlLookup[] }[][] = [];
    for (const group of this.goamlGroups()) {
      const partner = GOAML_ROW_PARTNER[group.type];
      const last = rows[rows.length - 1];
      if (partner && last?.length === 1 && last[0].type === partner) {
        last.push(group);
      } else {
        rows.push([group]);
      }
    }
    return rows;
  });

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(
        switchMap((access) => {
          this.canEdit.set(access.permissions.includes('UPDATE_AMLSETTINGS'));
          return forkJoin([
            this.compliance.goamlLookups(),
            this.compliance.goamlCodeLists()
          ]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        ([
          lookups,
          codeLists
        ]) => {
          this.showGoamlCodes(lookups);
          this.goamlCodeLists.set(codeLists);
        }
      );
  }

  private showGoamlCodes(rows: GoamlLookup[]): void {
    this.goamlLookups.set(rows);
    this.goamlCodes = {};
    rows.forEach((r) => (this.goamlCodes[this.goamlRowKey(r)] = r.code ?? ''));
  }

  goamlRowKey(row: Pick<GoamlLookup, 'type' | 'ourValue'>): string {
    return `${row.type}::${row.ourValue}`;
  }

  isInstitutionType(type: string): boolean {
    return type === GOAML_INSTITUTION_TYPE;
  }

  goamlCodeOptions(type: string): string[] {
    return this.goamlCodeLists()[type] ?? [];
  }

  goamlCodeValue(row: GoamlLookup): string {
    return this.goamlCodes[this.goamlRowKey(row)] ?? '';
  }

  setGoamlCode(row: GoamlLookup, value: string): void {
    this.goamlCodes[this.goamlRowKey(row)] = value;
  }

  isGoamlCodeEmpty(row: GoamlLookup): boolean {
    return !this.goamlCodeValue(row).trim();
  }

  /** Whether this row shows a hint sentence long enough to wrap onto two or three lines (the institution code's
   * hint always does; any empty row's "stays a draft" hint does too) - these need extra room below them so the
   * wrapped lines don't reach the field after them; a one-line hint (most rows) does not. */
  hasLongHint(row: GoamlLookup, type: string): boolean {
    return (this.isInstitutionType(type) && row.ourValue === 'CODE') || this.isGoamlCodeEmpty(row);
  }

  /** Re-read on every change-detection pass (not a signal computed()), since `goamlCodes` is a plain edited map,
   * the same way `isGoamlCodeEmpty` already is - so the count in the header stays live as codes are picked. */
  goamlMissingCount(): number {
    return this.goamlLookups().filter((r) => this.isGoamlCodeEmpty(r)).length;
  }

  saveGoamlCodes(): void {
    if (!this.canEdit() || this.savingCodes()) {
      return;
    }
    const rows: GoamlLookup[] = this.goamlLookups().map((r) => ({
      type: r.type,
      ourValue: r.ourValue,
      description: r.description,
      code: this.goamlCodeValue(r).trim() || null
    }));
    this.savingCodes.set(true);
    this.compliance.updateGoamlLookups(rows).subscribe({
      next: (fresh) => {
        this.savingCodes.set(false);
        this.showGoamlCodes(fresh);
        this.snackBar.open(this.translate.instant('compliance.goaml.Codes saved'), undefined, { duration: 3000 });
      },
      error: () => this.savingCodes.set(false)
    });
  }
}
