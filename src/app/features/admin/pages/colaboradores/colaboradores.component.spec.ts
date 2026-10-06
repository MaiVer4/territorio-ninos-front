import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ColaboradoresComponent } from './colaboradores.component';

describe('ColaboradoresComponent', () => {
  let component: ColaboradoresComponent;
  let fixture: ComponentFixture<ColaboradoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColaboradoresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaboradoresComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
