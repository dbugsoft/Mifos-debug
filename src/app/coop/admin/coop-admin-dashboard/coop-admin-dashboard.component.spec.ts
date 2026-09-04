import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopAdminDashboardComponent } from './coop-admin-dashboard.component';

describe('CoopAdminDashboardComponent', () => {
  let component: CoopAdminDashboardComponent;
  let fixture: ComponentFixture<CoopAdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopAdminDashboardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopAdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
