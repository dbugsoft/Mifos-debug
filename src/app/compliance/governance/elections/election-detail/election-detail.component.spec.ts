/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BsCalendarService } from 'app/core/bs-calendar/bs-calendar.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ElectionsService } from '../elections.service';
import { Election } from '../elections.models';
import { ElectionDetailComponent } from './election-detail.component';

describe('ElectionDetailComponent', () => {
  let fixture: ComponentFixture<ElectionDetailComponent>;
  let component: ElectionDetailComponent;
  let electionsService: { election: jest.Mock; voters: jest.Mock };

  const baseElection = (overrides: Partial<Election> = {}): Election => ({
    id: 5,
    title: 'Board election 2083',
    status: 'OPEN',
    electionOn: '2026-11-10',
    cutOffOn: '2026-10-25',
    minMembershipMonths: 12,
    calledByDecisionId: null,
    calledByDecision: null,
    note: null,
    committees: [{ id: 1, code: 'BOARD', name: 'Board' }],
    votersIncluded: null,
    votersLeftOut: null,
    meetingId: null,
    meetingHeldOn: null,
    resultDecisionId: null,
    resultDecision: null,
    termsStartOn: null,
    recordedBy: 'admin',
    rollFrozenOn: null,
    listPublishedOn: null,
    declaredOn: null,
    cancelReason: null,
    electionCommittee: [],
    staffNotLinked: 0,
    nominations: [],
    ...overrides
  });

  const create = async (election: Election, today = new Date(2026, 9, 20)) => {
    electionsService = {
      election: jest.fn(() => of(election)),
      voters: jest.fn(() => of([]))
    };

    await TestBed.configureTestingModule({
      imports: [
        ElectionDetailComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: String(election.id) })) } },
        { provide: ElectionsService, useValue: electionsService },
        { provide: MatDialog, useValue: { open: jest.fn() } },
        // *mifosxHasPermission reads this directly; granting ALL_FUNCTIONS keeps every action visible so the
        // tests below can check what the status alone controls, not the permission system on top of it.
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ElectionDetailComponent);
    component = fixture.componentInstance;
    // Only todayInNepal() is stubbed, kept on the real service, so AdToBsPipe's own use of the same instance
    // (toBs/formatLong, for every BS date on the page) still works exactly as it does in the app.
    jest.spyOn(TestBed.inject(BsCalendarService), 'todayInNepal').mockReturnValue(today);
    fixture.detectChanges();
  };

  function actionsText(): string {
    return fixture.nativeElement.querySelector('.actions')?.textContent ?? '';
  }

  it('OPEN: offers Edit, Freeze and Cancel, nothing else', async () => {
    await create(baseElection({ status: 'OPEN' }));
    const text = actionsText();
    expect(text).toContain('elections.FreezeRoll');
    expect(text).toContain('elections.CancelElection');
    expect(text).not.toContain('elections.Publish');
    expect(text).not.toContain('elections.EnterResults');
  });

  it('ROLL_FROZEN: offers Edit, Publish and Cancel, not Freeze', async () => {
    await create(baseElection({ status: 'ROLL_FROZEN', rollFrozenOn: '2026-10-25' }));
    const text = actionsText();
    expect(text).toContain('elections.Publish');
    expect(text).toContain('elections.CancelElection');
    expect(text).not.toContain('elections.FreezeRoll');
    expect(text).not.toContain('elections.EnterResults');
  });

  it('LIST_PUBLISHED: offers Enter results and Cancel, not Edit or Publish', async () => {
    await create(baseElection({ status: 'LIST_PUBLISHED', rollFrozenOn: '2026-10-25', listPublishedOn: '2026-10-26' }));
    const text = actionsText();
    expect(text).toContain('elections.EnterResults');
    expect(text).toContain('elections.CancelElection');
    expect(text).not.toContain('labels.buttons.Edit');
    expect(text).not.toContain('elections.Publish');
  });

  it('DECLARED: read only, no action buttons at all', async () => {
    await create(
      baseElection({
        status: 'DECLARED',
        rollFrozenOn: '2026-10-25',
        listPublishedOn: '2026-10-26',
        declaredOn: '2026-11-10',
        meetingHeldOn: '2026-11-10',
        termsStartOn: '2026-11-11'
      })
    );
    expect(fixture.nativeElement.querySelector('.actions')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('elections.SeeTheNewTerms');
  });

  it('CANCELLED: read only, status chip shows cancelled', async () => {
    await create(baseElection({ status: 'CANCELLED', cancelReason: 'No candidates came forward' }));
    expect(fixture.nativeElement.querySelector('.actions')).toBeNull();
    // The page only shows the "Cancelled" status chip, not a separate reason banner - the reason is still
    // on the election itself, just not rendered here.
    expect(fixture.nativeElement.textContent).toContain('elections.status.CANCELLED');
    expect(component.election()?.cancelReason).toBe('No candidates came forward');
  });

  it('disables Freeze voter roll before the cut-off day', async () => {
    await create(baseElection({ status: 'OPEN', cutOffOn: '2026-10-25' }), new Date(2026, 9, 20));
    expect(component.canFreezeRoll).toBe(false);
  });

  it('enables Freeze voter roll on or after the cut-off day', async () => {
    await create(baseElection({ status: 'OPEN', cutOffOn: '2026-10-25' }), new Date(2026, 9, 25));
    expect(component.canFreezeRoll).toBe(true);
  });

  it('shows a link to committees when no election committee is recorded', async () => {
    await create(baseElection({ electionCommittee: [] }));
    expect(fixture.nativeElement.textContent).toContain('elections.NoElectionCommittee');
  });

  it('warns when active staff are not linked to a member', async () => {
    await create(baseElection({ staffNotLinked: 3 }));
    expect(fixture.nativeElement.textContent).toContain('elections.StaffNotLinked');
    expect(fixture.nativeElement.querySelector('.notice')).not.toBeNull();
  });

  it('shows no staff-not-linked notice when every active staff is linked', async () => {
    await create(baseElection({ staffNotLinked: 0 }));
    expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
  });
});
