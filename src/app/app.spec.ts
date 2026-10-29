import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { App } from './app';
import { appConfig } from './app.config';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should configure MatIconRegistry default font set class to material-symbols-outlined via appConfig', () => {
    // Excluir únicamente el primer proveedor (provideZoneChangeDetection) que interfiere con el entorno de pruebas
    const providersWithoutZone = appConfig.providers.slice(1);
    const testBed = TestBed.resetTestingModule().configureTestingModule({
      providers: [
        ...providersWithoutZone,
        provideRouter([])
      ]
    });

    const iconRegistry = testBed.inject(MatIconRegistry);
    expect(iconRegistry.getDefaultFontSetClass()).toEqual([
      'material-symbols-outlined',
      'mat-ligature-font'
    ]);
  });
});
