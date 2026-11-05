/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ConfigurationsComponent } from './configurations.component';

describe('ConfigurationsComponent - Loan eligibility tab visibility (fineract-dbug #154)', () => {
  /** A fresh component for each permission set, since `showLoanEligibility` is computed once, at construction. */
  function configurationsWith(permissions: string[]): ConfigurationsComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ConfigurationsComponent,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } }
      ]
    });
    return TestBed.inject(ConfigurationsComponent);
  }

  it('hides the tab with neither permission', () => {
    expect(configurationsWith([]).showLoanEligibility).toBe(false);
  });

  it('shows the tab with READ_LOANELIGIBILITY alone', () => {
    expect(configurationsWith(['READ_LOANELIGIBILITY']).showLoanEligibility).toBe(true);
  });

  it("shows the tab with UPDATE_LOANELIGIBILITY alone, per the issue's own permission table", () => {
    expect(configurationsWith(['UPDATE_LOANELIGIBILITY']).showLoanEligibility).toBe(true);
  });

  it('shows the tab with both permissions', () => {
    expect(
      configurationsWith([
        'READ_LOANELIGIBILITY',
        'UPDATE_LOANELIGIBILITY'
      ]).showLoanEligibility
    ).toBe(true);
  });

  it('ALL_FUNCTIONS and ALL_FUNCTIONS_READ open it too, the same as any READ_ permission', () => {
    expect(configurationsWith(['ALL_FUNCTIONS_READ']).showLoanEligibility).toBe(true);
    expect(configurationsWith(['ALL_FUNCTIONS']).showLoanEligibility).toBe(true);
  });
});
