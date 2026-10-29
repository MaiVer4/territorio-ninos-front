import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TicketPreviewComponent } from './ticket-preview.component';
import { ConfiguracionParque } from '../../../../core/models/configuracion.model';

describe('TicketPreviewComponent', () => {
  let component: TicketPreviewComponent;
  let fixture: ComponentFixture<TicketPreviewComponent>;

  const mockConfig: ConfiguracionParque = {
    id: 1,
    nombreComercial: 'Territorio de Niños',
    razonSocial: 'Territorio de Niños S.A.S.',
    nit: '901.458.789-2',
    direccion: 'Av. Bolívar # 14N-55',
    telefono: '3104567890',
    ciudad: 'Armenia, Quindío',
    politicasSeguridad: 'Uso de medias antideslizantes obligatorio.',
    anchoPapelMm: 58,
    mensajePie: '¡Gracias por su visita!',
    tiempoGraciaGeneralSegundos: 60
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketPreviewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render fallback establishment data when config is null', () => {
    expect(component).toBeTruthy();
    expect(component.paperWidth()).toBe(80);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Territorio de Niños');
  });

  it('should toggle paper width between 58 and 80 mm', () => {
    component.setPaperWidth(58);
    expect(component.paperWidth()).toBe(58);

    component.setPaperWidth(80);
    expect(component.paperWidth()).toBe(80);
  });

  it('should update paper width when config input changes', () => {
    component.config = mockConfig;
    component.ngOnChanges({
      config: new SimpleChange(null, mockConfig, false)
    });
    expect(component.paperWidth()).toBe(58);
  });

  it('should generate QR code on initialization', async () => {
    await component.generateDemoQR();
    expect(component.qrDataUrl()).toBeTruthy();
    expect(component.qrDataUrl()).toContain('data:image/png;base64');
  });
});
