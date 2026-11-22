/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { filter, forkJoin, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { GoamlReadiness, GoamlSchemaInfo } from '../compliance.models';
import { InputDialogComponent } from '../input-dialog/input-dialog.component';
import { fixLink } from './goaml-gaps.component';

/** Errors that mean "our side may need a change", not "the file is broken". */
const SEND_TO_SUPPORT = [
  'error.msg.goaml.schema.invalid',
  'error.msg.goaml.schema.not.reports'
];

/**
 * goAML setup (fineract-dbug #290): what is still missing before the first report, each line linked to where it is
 * done, and the schema reports are checked against, with a newer file from FIU-Nepal uploaded or taken back.
 */
@Component({
  selector: 'mifosx-goaml-setup',
  templateUrl: './goaml-setup.component.html',
  styleUrls: ['./goaml-setup.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoamlSetupComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly readiness = signal<GoamlReadiness | null>(null);
  readonly schema = signal<GoamlSchemaInfo | null>(null);
  /** What went wrong with the last upload, as a translation key. */
  readonly uploadError = signal<string | null>(null);
  readonly canChange = computed(() => this.compliance.can('UPDATE_AMLSETTINGS'));
  readonly notChecked = computed(
    () => (this.schema()?.rulesNotReadByTheChecker ?? []).filter((r) => r.checkedBy === 'NOT_CHECKED').length
  );
  readonly fixLink = fixLink;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    forkJoin({ readiness: this.compliance.goamlReadiness(), schema: this.compliance.goamlSchema() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ readiness, schema }) => {
          this.readiness.set(readiness);
          this.schema.set(schema);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  /** The line's words: translated by its code and state, the backend's English for a code this screen does not know. */
  itemText(item: GoamlReadiness['items'][number], r: GoamlReadiness): string {
    // the language files nest by '.', so a code's own dots become '_'
    const key = 'compliance.setup.item.' + item.code.replace(/\./g, '_') + (item.ok ? '.ok' : '.todo');
    const count = item.code === 'codes.in.list' ? r.codesNotInList.length : r.codesEmpty.length;
    const text = this.translate.instant(key, { count });
    return text === key ? item.message : text;
  }

  upload(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploadError.set(null);
    this.dialog
      .open(InputDialogComponent, {
        data: {
          title: 'compliance.setup.Use this schema file',
          message: 'compliance.setup.uploadHint',
          fields: [
            {
              name: 'label',
              label: 'compliance.setup.Name of the file',
              required: true,
              maxLength: 100,
              value: file.name.replace(/\.xsd$/i, '')
            }
          ],
          confirm: 'compliance.setup.Use this schema file'
        },
        width: '520px',
        maxWidth: '95vw'
      })
      .afterClosed()
      .pipe(
        filter((v): v is Record<string, string> => !!v),
        switchMap(async (v) => ({ label: v['label'], xsd: await file.text() })),
        switchMap(({ label, xsd }) => {
          this.busy.set(true);
          return this.compliance.uploadGoamlSchema(label, xsd);
        })
      )
      .subscribe({
        next: (answer) => this.done('compliance.setup.Schema file in use', answer.reportsBackToDraft ?? 0),
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          const code: string | undefined = e?.error?.errors?.[0]?.userMessageGlobalisationCode;
          this.uploadError.set(
            code && SEND_TO_SUPPORT.includes(code)
              ? 'compliance.setup.sendToSupport'
              : code === 'error.msg.goaml.schema.empty'
                ? 'compliance.setup.fileEmpty'
                : code === 'error.msg.goaml.schema.label'
                  ? 'compliance.setup.labelTooLong'
                  : 'compliance.setup.uploadFailed'
          );
        }
      });
  }

  usePublished(): void {
    this.dialog
      .open(InputDialogComponent, {
        data: {
          title: 'compliance.setup.Go back to the file that came with the system',
          message: 'compliance.setup.goBackHint',
          fields: [],
          confirm: 'compliance.setup.Go back',
          danger: true
        },
        width: '520px',
        maxWidth: '95vw'
      })
      .afterClosed()
      .pipe(
        filter((v) => !!v),
        switchMap(() => {
          this.busy.set(true);
          return this.compliance.usePublishedGoamlSchema();
        })
      )
      .subscribe({
        next: (answer) =>
          this.done('compliance.setup.Back to the file that came with the system', answer.reportsBackToDraft ?? 0),
        error: () => this.busy.set(false)
      });
  }

  private done(message: string, backToDraft: number): void {
    this.busy.set(false);
    const drafts = backToDraft
      ? ' ' + this.translate.instant('compliance.setup.backToDraft', { count: backToDraft })
      : '';
    this.snackBar.open(this.translate.instant(message) + drafts, undefined, { duration: 6000 });
    this.load();
  }
}
