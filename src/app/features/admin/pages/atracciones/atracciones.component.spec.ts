import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AtraccionesComponent } from './atracciones.component';

describe('AtraccionesComponent', () => {
  let component: AtraccionesComponent;
  let fixture: ComponentFixture<AtraccionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtraccionesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AtraccionesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
