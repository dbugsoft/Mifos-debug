import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopAdminNavbarComponent } from './coop-admin-navbar.component';

describe('CoopAdminNavbarComponent', () => {
  let component: CoopAdminNavbarComponent;
  let fixture: ComponentFixture<CoopAdminNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopAdminNavbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopAdminNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
