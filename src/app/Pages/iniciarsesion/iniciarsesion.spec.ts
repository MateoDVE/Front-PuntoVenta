import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Iniciarsesion } from './iniciarsesion';

describe('Iniciarsesion', () => {
  let component: Iniciarsesion;
  let fixture: ComponentFixture<Iniciarsesion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Iniciarsesion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Iniciarsesion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
