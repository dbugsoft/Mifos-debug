import { TestBed } from '@angular/core/testing';

import { CoopAdminService } from './coop-admin.service';

describe('CoopAdminService', () => {
  let service: CoopAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoopAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
