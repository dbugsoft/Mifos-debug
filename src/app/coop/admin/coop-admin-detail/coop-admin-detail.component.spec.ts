import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopAdminDetailComponent } from './coop-admin-detail.component';

describe('CoopAdminDetailComponent', () => {
  let component: CoopAdminDetailComponent;
  let fixture: ComponentFixture<CoopAdminDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopAdminDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopAdminDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
