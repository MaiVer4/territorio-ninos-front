import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenoresChipsComponent } from './menores-chips.component';
import { Menor } from '../../../../core/models/cliente.model';
import { By } from '@angular/platform-browser';

describe('MenoresChipsComponent', () => {
  let component: MenoresChipsComponent;
  let fixture: ComponentFixture<MenoresChipsComponent>;

  const mockMenores: Menor[] = [
    { idMenor: 1, nombreCompleto: 'Mateo Gómez', edad: 5, documento: 'TI12345' },
    { idMenor: 2, nombreCompleto: 'Sofía Gómez', edad: 9 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenoresChipsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MenoresChipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render empty state when no minors are present', () => {
    expect(component).toBeTruthy();
    expect(component.menores.length).toBe(0);

    const emptyState = fixture.debugElement.query(By.css('[data-testid="empty-state-menores"]'));
    expect(emptyState).toBeTruthy();
  });

  it('should render chips when minors are provided', () => {
    component.menores = mockMenores;
    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('[data-testid="chip-menor"]'));
    expect(chips.length).toBe(2);

    const firstChipText = chips[0].nativeElement.textContent;
    expect(firstChipText).toContain('Mateo Gómez');
    expect(firstChipText).toContain('5 años');
  });

  it('should open and cancel inline form', () => {
    component.abrirFormulario();
    fixture.detectChanges();

    expect(component.mostrarFormulario()).toBe(true);
    let formEl = fixture.debugElement.query(By.css('[data-testid="form-nuevo-menor"]'));
    expect(formEl).toBeTruthy();

    component.cancelarFormulario();
    fixture.detectChanges();

    expect(component.mostrarFormulario()).toBe(false);
    formEl = fixture.debugElement.query(By.css('[data-testid="form-nuevo-menor"]'));
    expect(formEl).toBeFalsy();
  });

  it('should validate form and prevent adding minor with invalid data', () => {
    component.abrirFormulario();

    component.nuevoNombre = 'A'; // Too short
    component.nuevaEdad = 5;
    expect(component.formularioValido()).toBe(false);

    component.nuevoNombre = 'Lucas';
    component.nuevaEdad = -1; // Negative age
    expect(component.formularioValido()).toBe(false);

    component.nuevaEdad = 18; // Over 17
    expect(component.formularioValido()).toBe(false);

    component.nuevaEdad = 7;
    expect(component.formularioValido()).toBe(true);
  });

  it('should add minor, update list, and emit menorAgregado and menoresChange', () => {
    let agregado: Menor | undefined;
    let listaActualizada: Menor[] | undefined;
    component.menorAgregado.subscribe(m => (agregado = m));
    component.menoresChange.subscribe(l => (listaActualizada = l));

    component.abrirFormulario();
    component.nuevoNombre = 'Lucas Silva';
    component.nuevaEdad = 4;
    component.nuevoDoc = 'RC998877';

    component.agregarMenor();
    fixture.detectChanges();

    expect(component.menores.length).toBe(1);
    expect(component.menores[0].nombreCompleto).toBe('Lucas Silva');
    expect(component.menores[0].edad).toBe(4);
    expect(agregado?.nombreCompleto).toBe('Lucas Silva');
    expect(listaActualizada?.length).toBe(1);
    expect(component.mostrarFormulario()).toBe(false);
  });

  it('should remove minor, update list, and emit menorEliminado and menoresChange', () => {
    component.menores = mockMenores;
    fixture.detectChanges();

    let eliminado: Menor | undefined;
    let listaActualizada: Menor[] | undefined;
    component.menorEliminado.subscribe(m => (eliminado = m));
    component.menoresChange.subscribe(l => (listaActualizada = l));

    component.eliminarMenor(0);
    fixture.detectChanges();

    expect(component.menores.length).toBe(1);
    expect(component.menores[0].nombreCompleto).toBe('Sofía Gómez');
    expect(eliminado?.nombreCompleto).toBe('Mateo Gómez');
    expect(listaActualizada?.length).toBe(1);
  });

  it('should respect maxMenores limit', () => {
    component.maxMenores = 2;
    component.menores = mockMenores;
    fixture.detectChanges();

    expect(component.alcanzoLimite()).toBe(true);

    component.abrirFormulario();
    expect(component.mostrarFormulario()).toBe(false);
  });

  it('should hide action buttons when deshabilitado is true', () => {
    component.deshabilitado = true;
    component.menores = mockMenores;
    fixture.detectChanges();

    const addBtn = fixture.debugElement.query(By.css('[data-testid="btn-mostrar-formulario-menor"]'));
    expect(addBtn).toBeFalsy();

    const deleteBtn = fixture.debugElement.query(By.css('[data-testid="btn-eliminar-menor"]'));
    expect(deleteBtn).toBeFalsy();
  });
});
