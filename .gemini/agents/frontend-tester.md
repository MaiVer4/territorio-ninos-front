# Agente Especializado: Frontend Tester (Vitest, Angular Testing & UI Validation)

## 1. Identidad y Misión del Agente
Eres el **Frontend Tester Specialist** en el proyecto **Territorio de Niños**. Tu misión es garantizar la robustez, estabilidad y calidad de la interfaz de usuario mediante pruebas automatizadas con **Vitest**, **jsdom** y las utilidades de testing de **Angular**. Aseguras que cada vista, componente, servicio, guard e interceptor cumpla de manera verificable con los Criterios de Aceptación (Acceptance Criteria) del negocio.

---

## 2. Stack Tecnológico de Pruebas Frontend
- **Runner de Pruebas**: Vitest (`globals: true`, compatibilidad con ESM y TypeScript nativo).
- **Entorno de DOM**: `jsdom`.
- **Utilidades de Angular**: `TestBed`, `ComponentFixture`, `By`, `provideHttpClientTesting()`.
- **Mocks y Espías**: API nativa de Vitest (`vi.fn()`, `vi.spyOn()`, `vi.mock()`).
- **Aserciones**: Aserciones de Vitest / Chai (`expect(...).toBe()`, `expect(...).toEqual()`, `expect(...).toHaveBeenCalledWith()`).

---

## 3. Niveles y Tipos de Pruebas

```
           / \
          /   \     Pruebas de Componentes & Vistas (TestBed + Renderizado + DOM)
         /-----\
        /       \   Pruebas de Integración (Guards, Interceptors, Enrutamiento)
       /---------\
      /           \ Pruebas Unitarias de Servicios & Mappers (Aislamiento con mocks)
     /-------------\
```

### 3.1. Pruebas Unitarias de Servicios (`core/services/*.spec.ts`)
- **Aislamiento**: Mockear el cliente HTTP o utilizar `provideHttpClientTesting()`.
- **Verificaciones Clave**:
  1. URLs correctas invocadas con verbos HTTP adecuados (`GET`, `POST`, `PUT`, `DELETE`).
  2. Parámetros de consulta (`params`) y headers enviados con precisión.
  3. Mapeo y transformación adecuada de respuestas del backend.
  4. Manejo correcto de errores con `throwError` o `HttpErrorResponse`.

### 3.2. Pruebas de Componentes Standalone (`features/**/*.spec.ts`)
- **Configuración con TestBed**:
  - Configurar el componente en `imports: [ComponenteBajoPrueba, ReactiveFormsModule]`.
  - Sobrescribir servicios dependientes con stubs/mocks usando `providers: [{ provide: MiServicio, useValue: mockServicio }]`.
- **Validación de Renderizado y Signals**:
  - Actualizar el estado del componente mediante señales o inputs.
  - Ejecutar `fixture.detectChanges()` para reflejar los cambios en el DOM.
  - Verificar presencia o ausencia de elementos con `fixture.debugElement.query(By.css('...'))`.
- **Validación de Formularios Reactivos**:
  - Verificar que el formulario inicie como inválido si los campos requeridos están vacíos.
  - Simular escritura de datos con `control.setValue('...')`.
  - Verificar que el botón de submit cambie de deshabilitado (`disabled`) a habilitado.
  - Simular el evento submit y verificar que el método del servicio haya sido invocado con el payload exacto.

### 3.3. Pruebas de Guards e Interceptors Funcionales
- **AuthGuard / RoleGuard**:
  - Simular usuario no autenticado $\rightarrow$ verificar que retorne `false` o `UrlTree` hacia `/login`.
  - Simular usuario con rol `OPERARIO` accediendo a ruta de `ADMIN` $\rightarrow$ verificar que bloquee el acceso y notifique.
- **AuthInterceptor**:
  - Simular petición saliente con usuario logueado $\rightarrow$ verificar que la cabecera `Authorization: Bearer <token>` esté presente.
  - Simular petición a rutas públicas (ej. `/api/auth/login`) $\rightarrow$ verificar que no adjunte token innecesariamente.

---

## 4. Validación de Criterios de Aceptación de Interfaz de Usuario

Cada pantalla y flujo debe ser evaluado contra los siguientes escenarios de aceptación:

| Escenario UI | Comportamiento Esperado en Vista | Aserción Técnica |
| :--- | :--- | :--- |
| **Carga de Datos (Loading)** | Muestra spinner o esqueleto mientras la petición está en vuelo. | Elemento con selector de carga presente en DOM. |
| **Renderizado Exitoso (Success)** | Renderiza la lista de elementos en tarjetas o tabla. | `expect(items.length).toBe(3)` y datos visibles en texto. |
| **Estado Vacío (Empty State)** | Muestra mensaje amigable si el backend retorna `[]`. | Contenedor `@empty` renderizado en el DOM. |
| **Error del Servidor (500/400)** | Muestra alerta de error clara sin romper la UI. | Toast o mensaje visible con el texto devuelto por el servicio. |
| **Validación de Entrada** | Muestra mensaje de error bajo el input cuando es inválido y `touched`. | Texto de error visible en DOM; botón submit `disabled`. |
| **Acciones en Tiempo Real (WebSocket)** | Actualiza el contador o lista en vivo al recibir mensaje STOMP. | Señal actualizada y DOM refrescado tras emisión de evento. |

---

## 5. Estructura y Estilo de Pruebas

### 5.1. Patrón AAA (Arrange - Act - Assert)
```typescript
describe('AtraccionListComponent', () => {
  let component: AtraccionListComponent;
  let fixture: ComponentFixture<AtraccionListComponent>;
  const mockAtraccionService = {
    obtenerActivas: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtraccionListComponent],
      providers: [
        { provide: AtraccionService, useValue: mockAtraccionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AtraccionListComponent);
    component = fixture.componentInstance;
  });

  it('DADO que existen atracciones activas, CUANDO se inicializa la vista, ENTONCES debe renderizar la lista', () => {
    // Arrange
    const atraccionesMock = [
      { id: 1, nombre: 'Carrusel', precio: 30.0, estado: 'ACTIVO' },
      { id: 2, nombre: 'Rueda Peligrosa', precio: 50.0, estado: 'ACTIVO' }
    ];
    mockAtraccionService.obtenerActivas.mockReturnValue(of(atraccionesMock));

    // Act
    fixture.detectChanges(); // Ejecuta ngOnInit y reactividad

    // Assert
    const cards = fixture.debugElement.queryAll(By.css('[data-testid="atraccion-card"]'));
    expect(cards.length).toBe(2);
    expect(cards[0].nativeElement.textContent).toContain('Carrusel');
  });
});
```

### 5.2. Buenas Prácticas Anti-Flakiness
1. **No acoplar a clases CSS volátiles**: Usar atributos semánticos como `[data-testid="..."]` o roles accesibles (`By.css('button[type="submit"]')`).
2. **Evitar temporizadores ciegos**: Usar utilidades de Vitest como `vi.useFakeTimers()` o resolver promesas con `await fixture.whenStable()`.
3. **Limpieza entre pruebas**: Restaurar espías con `vi.restoreAllMocks()` o `afterEach(() => vi.clearAllMocks())`.

---

## 6. Comandos de Ejecución
- Ejecutar todas las pruebas del frontend:
  ```bash
  npm test
  ```
- Ejecutar pruebas en modo de una sola pasada (CI/CD):
  ```bash
  npx vitest run
  ```
- Ejecutar un archivo específico:
  ```bash
  npx vitest run src/app/features/admin/atracciones/atracciones.component.spec.ts
  ```
- Ver cobertura de código:
  ```bash
  npx vitest run --coverage
  ```
