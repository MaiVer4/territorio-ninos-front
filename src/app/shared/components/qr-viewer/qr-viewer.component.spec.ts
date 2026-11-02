import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { QrViewerComponent } from './qr-viewer.component';

describe('QrViewerComponent (HU-20.05 / HU-20.06)', () => {
  let component: QrViewerComponent;
  let fixture: ComponentFixture<QrViewerComponent>;

  const mockUuidV4 = 'c3b88b0a-7065-4f40-8f92-56360c7f1a30';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(QrViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when value and uuid are not provided', () => {
    const emptyEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-empty"]'));
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.nativeElement.textContent).toContain('Sin carga útil QR');

    const svgEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-svg"]'));
    expect(svgEl).toBeNull();
  });

  it('should render high-contrast SVG when value is provided (HU-20.05)', () => {
    component.value = mockUuidV4;
    component.codigoVisible = 'TDN-1-2026-001';
    fixture.detectChanges();

    const emptyEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-empty"]'));
    expect(emptyEl).toBeNull();

    const svgEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-svg"]'));
    expect(svgEl).toBeTruthy();
    expect(svgEl.attributes['shape-rendering']).toBe('crispEdges');

    // Matrix size for UUID v4 (36 chars) with level M is Version 3 (29x29 modules)
    // Total size with margin 4 on each side is 29 + 8 = 37 modules
    expect(component.tamanoMatriz()).toBe(29);
    expect(component.tamanoTotal()).toBe(37);
    expect(component.viewBox()).toBe('0 0 37 37');

    const pathEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-path-dark"]'));
    expect(pathEl).toBeTruthy();
    expect(pathEl.attributes['fill']).toBe('#000000');
    expect(pathEl.attributes['d']).toContain('M4 4');

    const codigoEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-codigo"]'));
    expect(codigoEl).toBeTruthy();
    expect(codigoEl.nativeElement.textContent).toContain('TDN-1-2026-001');

    const payloadEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-payload"]'));
    expect(payloadEl).toBeTruthy();
    expect(payloadEl.nativeElement.textContent).toContain(mockUuidV4);
  });

  it('should accept uuid input directly and link it as payload (HU-20.06 / CA-04)', () => {
    component.uuid = mockUuidV4;
    fixture.detectChanges();

    expect(component.payloadEfectivo()).toBe(mockUuidV4);

    const validacion = component.validacionOptica();
    expect(validacion.esValido).toBe(true);
    expect(validacion.versionQr).toBe(3);
    expect(validacion.tamanoMatriz).toBe(29);
    expect(validacion.contrasteAlto).toBe(true);
    expect(validacion.margenModulos).toBe(4);
    expect(validacion.detalles).toContain('UUID v4 óptimo para escáner móvil');
  });

  it('should render optical badge when mostrarInsigniaOptica is enabled', () => {
    component.value = mockUuidV4;
    component.mostrarInsigniaOptica = true;
    fixture.detectChanges();

    const badgeEl = fixture.debugElement.query(By.css('[data-testid="qr-viewer-optical-badge"]'));
    expect(badgeEl).toBeTruthy();
    expect(badgeEl.nativeElement.textContent).toContain('Óptimo para escaneo');
  });

  it('should detect low contrast and mark validacionOptica as invalid if colors do not meet standard', () => {
    component.value = mockUuidV4;
    component.darkColor = '#888888';
    component.lightColor = '#999999';
    fixture.detectChanges();

    const validacion = component.validacionOptica();
    expect(validacion.contrasteAlto).toBe(false);
    expect(validacion.esValido).toBe(false);
  });

  it('should generate SVG string via generarSvgString()', async () => {
    component.value = mockUuidV4;
    const svgStr = await component.generarSvgString();

    expect(svgStr).toBeTruthy();
    expect(svgStr).toContain('<svg');
    expect(svgStr).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svgStr).toContain('shape-rendering="crispEdges"');
  });

  it('should return synchronous SVG markup via obtenerSvgMarkup()', () => {
    component.value = mockUuidV4;
    fixture.detectChanges();

    const markup = component.obtenerSvgMarkup();
    expect(markup).toContain('<svg');
    expect(markup).toContain('viewBox="0 0 37 37"');
    expect(markup).toContain('shape-rendering="crispEdges"');
    expect(markup).toContain('<rect');
    expect(markup).toContain('<path');
  });
});
