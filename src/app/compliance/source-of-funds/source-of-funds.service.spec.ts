/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { SourceOfFundsService } from './source-of-funds.service';

describe('SourceOfFundsService', () => {
  const template = { line: 1000000, dayTotal: false, sources: [{ id: 3, name: 'Sale of land or a house' }] };
  let service: SourceOfFundsService;
  let http: HttpTestingController;
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    dialog = { open: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog }
      ]
    });
    service = TestBed.inject(SourceOfFundsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks from Rs 10 lakh, the line itself included', () => {
    expect(SourceOfFundsService.needsDeclaration(1000000, template)).toBe(true);
    expect(SourceOfFundsService.needsDeclaration(999999.99, template)).toBe(false);
    expect(SourceOfFundsService.needsDeclaration(5000000, null)).toBe(false);
  });

  it('lets a smaller deposit through without a dialog', () => {
    let answer: boolean | undefined;
    service.ensureDeclared('SAVINGS', { accountId: 7 }, 500000).subscribe((a) => (answer = a));
    http.expectOne('/nepal/aml/source-of-funds/template').flush(template);
    expect(answer).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens the dialog for a large deposit and posts only once it is saved', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    let answer: boolean | undefined;
    service.ensureDeclared('SAVINGS', { accountId: '7' }, 1200000).subscribe((a) => (answer = a));
    http.expectOne('/nepal/aml/source-of-funds/template').flush(template);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.mock.calls[0][1].data).toEqual(
      expect.objectContaining({ product: 'SAVINGS', accountId: 7, amount: 1200000, line: 1000000 })
    );
    expect(answer).toBe(true);
  });

  it('cancels the posting when the teller goes back', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    let answer: boolean | undefined;
    service.ensureDeclared('LOAN', { accountId: 9 }, 2000000).subscribe((a) => (answer = a));
    http.expectOne('/nepal/aml/source-of-funds/template').flush(template);
    expect(answer).toBe(false);
  });

  it('asks the backend for the line once', () => {
    service.ensureDeclared('SAVINGS', { accountId: 1 }, 10).subscribe();
    service.ensureDeclared('SAVINGS', { accountId: 1 }, 20).subscribe();
    http.expectOne('/nepal/aml/source-of-funds/template').flush(template);
  });
});
