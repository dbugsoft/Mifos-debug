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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ElectionsService } from '../../elections.service';
import { Voter } from '../../elections.models';
import { VoterRollComponent } from './voter-roll.component';

describe('VoterRollComponent CSV export', () => {
  let fixture: ComponentFixture<VoterRollComponent>;
  let component: VoterRollComponent;
  let electionsService: { voters: jest.Mock };
  let savedBlob: Blob | undefined;
  let savedName: string | undefined;

  const onRoll: Voter[] = [
    {
      clientId: 1,
      accountNo: 'AC-001',
      name: 'सीता थापा',
      officeName: 'Head Office',
      joinedOn: '2080-01-10',
      shares: 25,
      included: true,
      reason: null
    }
  ];

  const leftOut: Voter[] = [
    {
      clientId: 2,
      accountNo: 'AC-002',
      name: 'राम राई',
      officeName: 'Head Office',
      joinedOn: '2079-05-01',
      shares: 0,
      included: false,
      reason: 'NO_SHARES'
    }
  ];

  const create = async (included: boolean) => {
    electionsService = { voters: jest.fn((_id: number, inc: boolean) => of(inc ? onRoll : leftOut)) };

    await TestBed.configureTestingModule({
      imports: [
        VoterRollComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ElectionsService, useValue: electionsService }
      ]
    }).compileComponents();

    // The real app loads these from en-US.json; a minimal set here is enough to check the CSV actually carries
    // translated text (header and reason), not just the bare translation keys ngx-translate falls back to.
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      elections: {
        AccountNumber: 'Account number',
        JoinedOn: 'Joined on',
        Shares: 'Shares',
        Reason: 'Reason',
        voterReason: { NO_SHARES: 'Held no share on the cut-off day' }
      },
      labels: { inputs: { name: 'Name', Office: 'Office' } }
    });
    translate.use('en');

    fixture = TestBed.createComponent(VoterRollComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('electionId', 5);
    fixture.detectChanges();
    if (!included) {
      component.toggle(false);
    }

    savedBlob = undefined;
    savedName = undefined;
    // jsdom has no createObjectURL/revokeObjectURL at all, so these are assigned outright rather than spied on.
    URL.createObjectURL = jest.fn((blob: Blob) => {
      savedBlob = blob;
      return 'blob:mock';
    });
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      savedName = this.download;
    });
  };

  function csvText(): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(savedBlob!, 'utf-8');
    });
  }

  // Decoding as text (above) consumes the BOM, same as a real browser does - it exists to be read by whatever
  // opens the raw file (Excel), not to show up once decoded. Checking for it needs the undecoded bytes instead.
  function csvBytes(): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(savedBlob!);
    });
  }

  it('starts the file with a UTF-8 BOM, so Excel shows the Nepali names correctly', async () => {
    await create(true);
    component.download();
    const bytes = await csvBytes();
    // EF BB BF is the UTF-8 encoding of U+FEFF.
    expect(Array.from(bytes.slice(0, 3))).toEqual([
      0xef,
      0xbb,
      0xbf
    ]);
  });

  it('writes the on-roll header without a Reason column', async () => {
    await create(true);
    component.download();
    const text = await csvText();
    const header = text.replace('﻿', '').split('\r\n')[0];
    expect(header).toBe('"Account number","Name","Office","Joined on","Shares"');
    expect(savedName).toBe('election-5-voters-on-roll.csv');
  });

  it('adds a translated Reason column and value for the left-out list', async () => {
    await create(false);
    component.download();
    const text = await csvText();
    const lines = text.replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('"Account number","Name","Office","Joined on","Shares","Reason"');
    expect(lines[1]).toContain('"Held no share on the cut-off day"');
    expect(savedName).toBe('election-5-voters-left-out.csv');
  });

  it('keeps the Nepali name intact in the exported row', async () => {
    await create(true);
    component.download();
    const text = await csvText();
    expect(text).toContain('सीता थापा');
  });
});
