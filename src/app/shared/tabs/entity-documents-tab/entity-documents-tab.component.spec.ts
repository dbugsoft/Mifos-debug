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
import {
  faDownload,
  faEye,
  faFile,
  faFileExcel,
  faFilePdf,
  faFileWord,
  faPlus,
  faTimes,
  faTrash,
  faUpload
} from '@fortawesome/free-solid-svg-icons';
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
        { provide: ClientsService, useValue: { downloadClientDocument: jest.fn(() => of(new Blob(['%PDF']))) } },
        { provide: LoansService, useValue: {} },
        { provide: SavingsService, useValue: {} },
        { provide: DocumentPreviewService, useValue: { isPreviewable: () => false, release: jest.fn() } },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } })
      .compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(
      faDownload,
      faEye,
      faFile,
      faFileExcel,
      faFilePdf,
      faFileWord,
      faPlus,
      faTimes,
      faTrash,
      faUpload
    );

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

  it('downloads a document under its file name from the download button', () => {
    (URL as any).createObjectURL = jest.fn(() => 'blob:doc');
    (URL as any).revokeObjectURL = jest.fn();
    let downloadedAs = '';
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadedAs = this.download;
    });
    component.entityDocuments[0].fileName = 'passport.pdf';

    fixture.nativeElement.querySelector('button[aria-label^="labels.buttons.Download"]').click();

    expect(TestBed.inject(ClientsService).downloadClientDocument).toHaveBeenCalledWith('1', 1);
    expect(downloadedAs).toBe('passport.pdf');
    click.mockRestore();
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
