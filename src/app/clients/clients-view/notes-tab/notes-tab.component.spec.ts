/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faEdit, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { NotesTabComponent } from './notes-tab.component';
import { ClientsService } from 'app/clients/clients.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';

/**
 * The notes list is rendered by the shared `mifosx-entity-notes-tab` child, which is OnPush.
 * These tests assert the rendered DOM, not just the backing array: mutating the array in place
 * from an HTTP callback leaves the child stale until a full page reload (the reported bug).
 */
describe('NotesTabComponent (clients)', () => {
  let component: NotesTabComponent;
  let fixture: ComponentFixture<NotesTabComponent>;
  let clientsService: jest.Mocked<ClientsService>;

  const renderedNotes = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.note-content')).map((el: any) => el.textContent.trim());

  beforeEach(async () => {
    clientsService = {
      createClientNote: jest.fn(() => of({ resourceId: 2 })),
      editClientNote: jest.fn(() => of({})),
      deleteClientNote: jest.fn(() => of({}))
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        NotesTabComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            parent: { snapshot: { params: { clientId: '1' } } },
            data: of({
              clientNotes: [{ id: 1, note: 'First note', createdByUsername: 'mifos', createdOn: new Date() }]
            })
          }
        },
        { provide: ClientsService, useValue: clientsService },
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ username: 'mifos' }) } },
        { provide: SettingsService, useValue: { dateFormat: 'dd MMMM yyyy', language: { code: 'en-US' } } },
        Dates,
        DatePipe,
        provideAnimationsAsync()
      ]
    }).compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(faEdit, faPlus, faTrash);

    fixture = TestBed.createComponent(NotesTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders an added note without a reload', () => {
    component.addNote({ note: 'Second note' });
    fixture.detectChanges();

    expect(renderedNotes()).toEqual([
      'First note',
      'Second note'
    ]);
  });

  it('renders an edited note without a reload', () => {
    component.editNote('1', { note: 'Edited note' }, 0);
    fixture.detectChanges();

    expect(renderedNotes()).toEqual(['Edited note']);
  });

  it('removes a deleted note without a reload', () => {
    component.deleteNote('1', 0);
    fixture.detectChanges();

    expect(renderedNotes()).toEqual([]);
  });
});
