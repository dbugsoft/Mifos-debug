import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopNavbarComponent } from './coop-navbar.component';

describe('CoopNavbarComponent', () => {
  let component: CoopNavbarComponent;
  let fixture: ComponentFixture<CoopNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopNavbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
