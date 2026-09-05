import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Atracciones } from './atracciones';

describe('Atracciones', () => {
  let component: Atracciones;
  let fixture: ComponentFixture<Atracciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Atracciones],
    }).compileComponents();

    fixture = TestBed.createComponent(Atracciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
