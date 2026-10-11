/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { HitGroup, HitRow, ListSource, ListVersion, Lists, LoadResult, ScreeningService } from '../screening.service';

type View = 'OPEN' | 'NOT_A_MATCH' | 'CONFIRMED' | 'CLEARED' | 'ALL';

/**
 * Compliance › Screening (fineract-dbug #203): the sanctions lists the cooperative holds, loading a new version, and the
 * possible matches grouped by list entry so a common name is one decision.
 */
@Component({
  selector: 'mifosx-screening-home',
  templateUrl: './screening-home.component.html',
  styleUrls: ['./screening-home.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScreeningHomeComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private screening = inject(ScreeningService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly views: View[] = [
    'OPEN',
    'NOT_A_MATCH',
    'CONFIRMED',
    'CLEARED',
    'ALL'
  ];
  readonly view = signal<View>('OPEN');
  readonly allowed = signal<boolean | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly lists = signal<Lists | null>(null);
  readonly groups = signal<HitGroup[]>([]);
  readonly result = signal<LoadResult | null>(null);
  canManage = false;

  /** The version in use for each list. */
  readonly current = computed<ListVersion[]>(() => (this.lists()?.versions ?? []).filter((v) => v.current));
  /** Earlier versions, newest first. */
  readonly earlier = computed<ListVersion[]>(() =>
    (this.lists()?.versions ?? []).filter((v) => !v.current).slice(0, 10)
  );

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLSCREENING');
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          const v = (p.get('view') ?? 'OPEN').toUpperCase() as View;
          this.view.set(this.views.includes(v) ? v : 'OPEN');
          if (this.allowed()) {
            this.loadHits();
          }
        });
        if (this.allowed()) {
          this.loadLists();
        }
      });
  }

  show(view: View): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view: view.toLowerCase() }, replaceUrl: true });
  }

  open(m: HitRow): void {
    this.router.navigate([
      '/compliance',
      'screening',
      'matches',
      m.id
    ]);
  }

  openCount(g: HitGroup): number {
    return g.matches.filter((m) => m.status === 'OPEN').length;
  }

  upload(source: ListSource, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.loaded(this.screening.upload(source, file));
    }
  }

  downloadUn(): void {
    this.loaded(this.screening.downloadUn());
  }

  screenAll(): void {
    this.busy.set(true);
    this.result.set(null);
    this.screening.screenAll().subscribe({
      next: (s) => {
        this.result.set({ listId: 0, unchanged: false, screening: s });
        this.refresh();
      },
      error: () => this.busy.set(false)
    });
  }

  template(): void {
    this.screening.template().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sanctions-list-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /** "Not a match" for every open match of one list entry, with one reason kept on each. */
  notAMatchAll(g: HitGroup): void {
    const ids = g.matches.filter((m) => m.status === 'OPEN').map((m) => m.id);
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: {
          title: 'compliance.screening.Not a match for all',
          message: 'compliance.screening.allLead',
          fields: [
            {
              name: 'reason',
              label: 'compliance.screening.Why',
              type: 'textarea',
              required: true,
              maxLength: 1000,
              hint: 'compliance.screening.whyHint'
            }
          ],
          confirm: 'compliance.screening.Record not a match'
        },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.busy.set(true);
          this.screening.notAMatchAll(ids, r['reason']).subscribe({
            next: () => this.refresh(),
            error: () => this.busy.set(false)
          });
        }
      });
  }

  private loaded(call: ReturnType<ScreeningService['downloadUn']>): void {
    this.busy.set(true);
    this.result.set(null);
    call.subscribe({
      next: (r) => {
        this.result.set(r);
        this.refresh();
      },
      error: () => {
        this.busy.set(false);
        this.loadLists();
      }
    });
  }

  private refresh(): void {
    this.loadLists();
    this.loadHits();
  }

  private loadLists(): void {
    this.screening.lists().subscribe((l) => {
      this.lists.set(l);
      this.busy.set(false);
    });
  }

  private loadHits(): void {
    this.loading.set(true);
    this.screening.hits(this.view()).subscribe({
      next: (g) => {
        this.groups.set(g);
        this.loading.set(false);
      },
      error: () => {
        this.groups.set([]);
        this.loading.set(false);
      }
    });
  }
}
