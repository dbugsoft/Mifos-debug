/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* eslint-disable @angular-eslint/prefer-inject */
/** Angular Imports */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
/** Custom Services */
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AnalyticsDataSourceService } from '../services/analytics-data-source.service';
import { AnalyticsVisibilityService } from '../services/analytics-visibility.service';
/** Custom Models */
import {
  AnalyticsDashboardDefinition,
  AnalyticsFilters,
  AnalyticsWidgetDefinition,
  AnalyticsWidgetState
} from '../models/analytics-dashboard.model';
/** Custom Imports */
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DashboardWidgetComponent } from '../dashboard-widget/dashboard-widget.component';

@Component({
  selector: 'mifosx-analytics-dashboard',
  standalone: true,
  templateUrl: './dashboard-engine.component.html',
  styleUrls: ['./dashboard-engine.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    DashboardWidgetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardEngineComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) dashboard!: AnalyticsDashboardDefinition;
  @Input() offices: any[] = [];

  filtersForm!: UntypedFormGroup;
  visibleWidgets: AnalyticsWidgetDefinition[] = [];
  widgetStateMap: Record<string, AnalyticsWidgetState> = {};

  private filtersSubscription?: Subscription;
  /** In-flight widget loads (including retries) for the current filters */
  private widgetLoads = new Subscription();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private analyticsDataSourceService: AnalyticsDataSourceService,
    private analyticsVisibilityService: AnalyticsVisibilityService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}
  get metricWidgets(): AnalyticsWidgetDefinition[] {
    return this.visibleWidgets.filter((widget) => widget.type === 'metric');
  }

  get chartWidgets(): AnalyticsWidgetDefinition[] {
    return this.visibleWidgets.filter((widget) => widget.type === 'chart');
  }

  ngOnInit(): void {
    this.updateVisibleWidgets();

    this.filtersForm = this.formBuilder.group({
      officeId: [this.resolveDefaultOfficeId()],
      timescale: ['Month']
    });

    this.filtersSubscription = this.filtersForm.valueChanges.subscribe(() => {
      this.reloadDashboard();
    });

    this.reloadDashboard();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dashboard']) {
      this.updateVisibleWidgets();
      if (this.filtersForm) {
        this.reloadDashboard();
      }
    }
    if (
      changes['offices'] &&
      this.filtersForm &&
      !this.offices.some((office) => office.id === this.filtersForm.value.officeId)
    ) {
      this.filtersForm.patchValue(
        {
          officeId: this.resolveDefaultOfficeId()
        },
        { emitEvent: false }
      );
      this.reloadDashboard();
    }
  }
  ngOnDestroy(): void {
    if (this.filtersSubscription) {
      this.filtersSubscription.unsubscribe();
    }

    this.widgetLoads.unsubscribe();
  }

  reloadDashboard(forceRefresh: boolean = false): void {
    if (!this.visibleWidgets.length) {
      return;
    }

    if (forceRefresh) {
      this.analyticsDataSourceService.clearCache();
    }

    // Drop loads for the previous filters so late responses cannot overwrite newer ones
    this.widgetLoads.unsubscribe();
    this.widgetLoads = new Subscription();

    const filters = this.filtersForm.getRawValue() as AnalyticsFilters;
    this.visibleWidgets.forEach((widget) => this.loadWidget(widget, filters));
  }

  retryWidget(widget: AnalyticsWidgetDefinition): void {
    this.loadWidget(widget, this.filtersForm.getRawValue() as AnalyticsFilters);
  }

  /** Loads a single widget; each widget renders as soon as its own data arrives. */
  private loadWidget(widget: AnalyticsWidgetDefinition, filters: AnalyticsFilters): void {
    this.setWidgetState(widget.id, { loading: true, empty: false });
    this.widgetLoads.add(
      this.analyticsDataSourceService.loadWidget(widget, filters).subscribe({
        next: (state) => this.setWidgetState(widget.id, state),
        error: () => this.setWidgetState(widget.id, { loading: false, empty: false, error: true })
      })
    );
  }

  private setWidgetState(widgetId: string, state: AnalyticsWidgetState): void {
    this.widgetStateMap = { ...this.widgetStateMap, [widgetId]: state };
    // OnPush: results arrive asynchronously, so the view must be marked dirty explicitly
    this.changeDetectorRef.markForCheck();
  }

  private resolveDefaultOfficeId(): number | null {
    const credentials = this.authenticationService.getCredentials();
    const currentOfficeId = credentials?.officeId;

    if (currentOfficeId && this.offices.some((office) => office.id === currentOfficeId)) {
      return currentOfficeId;
    }

    return this.offices[0]?.id ?? null;
  }
  private updateVisibleWidgets(): void {
    this.visibleWidgets = (this.dashboard?.widgets || []).filter((widget) =>
      this.analyticsVisibilityService.canView(widget.visibleTo)
    );
  }
}
