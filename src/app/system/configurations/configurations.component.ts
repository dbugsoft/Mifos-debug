/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Alert } from 'app/core/alert/alert.model';
import { AlertService } from 'app/core/alert/alert.service';
import { SettingsService } from 'app/settings/settings.service';
import { Subscription } from 'rxjs';
import { SystemService } from '../system.service';
import { MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { GlobalConfigurationsTabComponent } from './global-configurations-tab/global-configurations-tab.component';
import { BusinessDateTabComponent } from './business-date-tab/business-date-tab.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MembershipSettingsComponent } from 'app/clients/membership/membership-settings/membership-settings.component';
import { MembershipService } from 'app/clients/membership/membership.service';

@Component({
  selector: 'mifosx-configurations',
  templateUrl: './configurations.component.html',
  styleUrls: ['./configurations.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTabGroup,
    MatTab,
    MatTabContent,
    GlobalConfigurationsTabComponent,
    BusinessDateTabComponent,
    MembershipSettingsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationsComponent implements OnInit {
  private alertService = inject(AlertService);
  private systemService = inject(SystemService);

  /** Subscription to alerts. */
  alert$: Subscription;

  isBusinessDateEnabled = false;
  /** Membership settings (fineract-dbug ADR 0023), for users who may read memberships */
  readonly showMembership = inject(MembershipService).canRead();

  ngOnInit(): void {
    this.alert$ = this.alertService.alertEvent.subscribe((alertEvent: Alert) => {
      const alertType = alertEvent.type;
      if (alertType === SettingsService.businessDateType + ' Set Config') {
        this.isBusinessDateEnabled = alertEvent.enabled ? true : false;
      }
    });
    this.getConfigurations();
  }

  /**
   * Get the Configuration and the Business Date data
   */
  getConfigurations(): void {
    this.systemService
      .getConfigurationByName(SettingsService.businessDateConfigName)
      .subscribe((configurationData: any) => {
        this.isBusinessDateEnabled = configurationData.enabled;
      });
  }
}
