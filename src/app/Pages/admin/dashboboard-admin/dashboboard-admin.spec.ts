import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboboardAdmin } from './dashboboard-admin';

describe('DashboboardAdmin', () => {
  let component: DashboboardAdmin;
  let fixture: ComponentFixture<DashboboardAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboboardAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboboardAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
