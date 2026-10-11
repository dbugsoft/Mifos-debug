/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DragScrollDirective } from 'app/directives/drag-scroll.directive';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { ReportPreferencesService } from './report-preferences.service';

/** Route param for reports that have no category. */
export const UNCATEGORIZED = 'Others';
/** Route param for the user's favourite reports. */
export const FAVOURITES = 'favourites';
/** Route param for the user's recently run reports. */
export const RECENT = 'recent';

/** Order of the core Fineract categories in the tab bar; other categories follow alphabetically. */
const CATEGORY_ORDER = [
  'Client',
  'Loan',
  'Savings',
  'Fund',
  'Accounting'
];

/** A tab in the reports category bar. */
export interface ReportCategory {
  /** Route param and filter value. */
  name: string;
  /** Number of reports in the category. */
  count: number;
  /** Translation key, set for the favourites and recent shortcuts. */
  labelKey?: string;
  /** Material icon, set for the favourites and recent shortcuts. */
  icon?: string;
}

/**
 * Reports component.
 */
@Component({
  selector: 'mifosx-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator,
    MatIcon,
    MatIconButton,
    MatTooltip,
    DragScrollDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private preferences = inject(ReportPreferencesService);

  /** Reports data. */
  reportsData: any;
  /** Report category filter. */
  filter: string;
  /** Categories shown as tabs. */
  categories: ReportCategory[] = [];
  /** Columns to be displayed in reports table. */
  displayedColumns: string[] = [
    'favourite',
    'reportName',
    'reportType'
  ];
  /** Data source for reports table. */
  dataSource = new MatTableDataSource();

  /** Paginator for reports table. */
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  /** Sorter for reports table. */
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  /**
   * Retrieves the reports data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   * Prevents reuse of route parameter `filter`.
   * @param {Router} router: Router.
   */
  constructor() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { reports: any }) => {
      this.reportsData = data.reports;
    });
    this.filter = this.route.snapshot.params['filter'];
  }

  /*
   *Sets and filters the reports table by category.
   */
  ngOnInit() {
    this.setCategories();
    if (!this.filter && this.categories.length) {
      this.router.navigate(
        [
          '/reports',
          this.categories[0].name
        ],
        { replaceUrl: true }
      );
      return;
    }
    this.setReports();
    this.setCustomFilterPredicate();
  }

  /**
   * Filters the reports of the selected tab by a search string.
   * @param {string} filterValue filter string for mat-table.
   */
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  /**
   * Initializes the data source, paginator and sorter for reports table.
   */
  setReports() {
    this.dataSource = new MatTableDataSource(this.reportsInView());
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Reports of the selected tab; the shortcuts keep their own order (most recent first for recent).
   */
  reportsInView(): any[] {
    const reports: any[] = this.reportsData || [];
    if (this.filter === FAVOURITES || this.filter === RECENT) {
      const ids = this.filter === FAVOURITES ? this.preferences.favourites : this.preferences.recent;
      return ids.map((id) => reports.find((report) => report.id === id)).filter(Boolean);
    }
    return reports.filter((report) => this.categoryOf(report) === this.filter);
  }

  /**
   * Sets the tabs: favourites and recent (when they have reports, or are open), then the categories.
   */
  setCategories() {
    const reports: any[] = this.reportsData || [];
    const exists = (id: number) => reports.some((report) => report.id === id);
    const shortcuts: ReportCategory[] = [
      {
        name: FAVOURITES,
        count: this.preferences.favourites.filter(exists).length,
        labelKey: 'labels.text.Favourites',
        icon: 'star'
      },
      {
        name: RECENT,
        count: this.preferences.recent.filter(exists).length,
        labelKey: 'labels.text.Recent',
        icon: 'history'
      }
    ].filter((shortcut) => shortcut.count > 0 || shortcut.name === this.filter);
    this.categories = [
      ...shortcuts,
      ...this.buildCategories(reports)
    ];
  }

  /**
   * @param {any} report Report.
   * @returns {boolean} Whether the report is one of the user's favourites.
   */
  isFavourite(report: any): boolean {
    return this.preferences.isFavourite(report.id);
  }

  /**
   * Stars or unstars a report without opening it.
   * @param {Event} event Click event, stopped so the row link doesn't fire.
   * @param {any} report Report.
   */
  toggleFavourite(event: Event, report: any) {
    event.stopPropagation();
    this.preferences.toggleFavourite(report.id);
    this.setCategories();
    if (this.filter === FAVOURITES) {
      this.dataSource.data = this.reportsInView();
    }
  }

  /**
   * Groups reports into categories with counts, core categories first and uncategorized last.
   * @param {any[]} reports Reports.
   */
  buildCategories(reports: any[]): ReportCategory[] {
    const counts = new Map<string, number>();
    reports.forEach((report) => {
      const name = this.categoryOf(report);
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const rank = (name: string) => {
      if (name === UNCATEGORIZED) {
        return CATEGORY_ORDER.length + 1;
      }
      const index = CATEGORY_ORDER.indexOf(name);
      return index === -1 ? CATEGORY_ORDER.length : index;
    };
    return Array.from(
      counts,
      ([
        name,
        count
      ]) => ({ name, count })
    ).sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  }

  /**
   * Category of a report, as used in the route param.
   * @param {any} report Report.
   */
  categoryOf(report: any): string {
    const category = report.reportCategory;
    return !category || category === '(NULL)' || category.trim() === '' ? UNCATEGORIZED : category;
  }

  /**
   *  Filters Reports for filter value string.
   */
  setCustomFilterPredicate() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      /** Transform the data into a lowercase string of all property values. */
      const dataStr = Object.keys(data)
        .reduce(function (currentTerm: string, key: string) {
          /** Use an obscure Unicode character to delimit the words in the concatenated string.
           * This avoids matches where the values of two columns combined will match the user's query
           */
          return currentTerm + /** @type {any} */ data[key] + '◬';
        }, '')
        .toLowerCase();
      /** Transform the filter by converting it to lowercase and removing whitespace. */
      const transformedFilter = filter.trim().toLowerCase();
      return dataStr.indexOf(transformedFilter) !== -1;
    };
  }

  getCategoryKey(category: string): string {
    if (!category || category === '(NULL)' || category === UNCATEGORIZED || category.trim() === '') {
      return 'labels.text.Others';
    }

    if (category.startsWith('labels.text.')) {
      return category;
    }
    return 'labels.text.' + category;
  }

  cleanTranslatedCategory(translatedText: string): string {
    if (!translatedText) return '';

    return translatedText.replace(/^labels\.text\./, '').replace(/^label\.text\./, '');
  }
}
