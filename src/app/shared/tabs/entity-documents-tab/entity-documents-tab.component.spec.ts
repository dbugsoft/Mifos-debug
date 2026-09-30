/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEye, faFile, faPlus, faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { EntityDocumentsTabComponent } from './entity-documents-tab.component';
import { ClientsService } from 'app/clients/clients.service';
import { LoansService } from 'app/loans/loans.service';
import { SavingsService } from 'app/savings/savings.service';
import { DocumentPreviewService } from 'app/shared/services/document-preview.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';

/**
 * The component is OnPush and changes the list from dialog callbacks, so these tests assert the
 * rendered DOM: a list that only changes in memory stays stale on screen until a reload (the reported bug).
 */
describe('EntityDocumentsTabComponent', () => {
  let component: EntityDocumentsTabComponent;
  let fixture: ComponentFixture<EntityDocumentsTabComponent>;
  let dialogResult: any;

  const renderedTitles = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.title')).map((el: any) => el.textContent.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EntityDocumentsTabComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: ClientsService, useValue: {} },
        { provide: LoansService, useValue: {} },
        { provide: SavingsService, useValue: {} },
        { provide: DocumentPreviewService, useValue: { isPreviewable: () => false, release: jest.fn() } },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } })
      .compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(faEye, faFile, faPlus, faTimes, faUpload);

    fixture = TestBed.createComponent(EntityDocumentsTabComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entityId', '1');
    fixture.componentRef.setInput('entityType', 'clients');
    fixture.componentRef.setInput('entityDocuments', [
      { id: 1, name: 'Passport' },
      { id: 2, name: 'Citizenship' }
    ]);
    fixture.componentRef.setInput('callbackDelete', jest.fn());
    fixture.componentRef.setInput(
      'callbackUpload',
      jest.fn(() => of({ resourceId: 3 }))
    );
    fixture.detectChanges();
  });

  it('removes a deleted document without a reload', () => {
    dialogResult = { delete: true };
    component.deleteDocument(1 as any, 'Passport');
    fixture.detectChanges();

    expect(component.callbackDelete).toHaveBeenCalledWith(1);
    expect(renderedTitles()).toEqual(['Citizenship']);
  });

  it('keeps the document when the delete dialog is dismissed', () => {
    dialogResult = undefined;
    component.deleteDocument(1 as any, 'Passport');
    fixture.detectChanges();

    expect(component.callbackDelete).not.toHaveBeenCalled();
    expect(renderedTitles()).toEqual([
      'Passport',
      'Citizenship'
    ]);
  });

  it('renders an uploaded document without a reload', () => {
    dialogResult = { fileName: 'Licence', description: '', file: new File([''], 'licence.png') };
    component.uploadDocument();
    fixture.detectChanges();

    expect(renderedTitles()).toEqual([
      'Passport',
      'Citizenship',
      'Licence'
    ]);
  });
});
