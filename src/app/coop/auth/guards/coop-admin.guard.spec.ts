import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { coopAdminGuard } from './coop-admin.guard';

describe('coopAdminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => coopAdminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
