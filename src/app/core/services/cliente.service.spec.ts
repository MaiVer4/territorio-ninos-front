import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClienteService } from './cliente.service';
import { Cliente, ClienteRegistroDTO } from '../models/cliente.model';

describe('ClienteService', () => {
  let service: ClienteService;
  let httpTesting: HttpTestingController;

  const mockCliente: Cliente = {
    idCliente: 1,
    tipoDocumento: 'CC',
    numeroDocumento: '1098765432',
    nombreCompleto: 'Juan Pérez',
    telefono: '3001234567',
    correo: 'juan.perez@example.com',
    direccion: 'Calle 10 # 20-30',
    fechaRegistro: '2026-10-22T10:00:00Z',
    menores: [
      {
        idMenor: 1,
        nombreCompleto: 'Mateo Pérez',
        documento: '1122334455',
        edad: 6,
        parentesco: 'Hijo'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClienteService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ClienteService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('buscarPorDocumento', () => {
    it('should return client data when found (200 OK)', () => {
      let result: Cliente | null | undefined;

      service.buscarPorDocumento('1098765432').subscribe(cliente => {
        result = cliente;
      });

      const req = httpTesting.expectOne(request =>
        request.url.includes('/clientes/documento/1098765432') && request.method === 'GET'
      );
      req.flush(mockCliente);

      expect(result).toEqual(mockCliente);
    });

    it('should return null when client is not found (404 Not Found)', () => {
      let result: Cliente | null | undefined;

      service.buscarPorDocumento('9999999999').subscribe(cliente => {
        result = cliente;
      });

      const req = httpTesting.expectOne(request =>
        request.url.includes('/clientes/documento/9999999999') && request.method === 'GET'
      );
      req.flush({ mensaje: 'Cliente no encontrado' }, { status: 404, statusText: 'Not Found' });

      expect(result).toBeNull();
    });

    it('should throw error when server returns an unexpected error (500)', () => {
      let errorResponse: any;

      service.buscarPorDocumento('1098765432').subscribe({
        next: () => { throw new Error('should have failed with 500 error'); },
        error: (err) => {
          errorResponse = err;
        }
      });

      const req = httpTesting.expectOne(request =>
        request.url.includes('/clientes/documento/1098765432')
      );
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(errorResponse).toBeTruthy();
      expect(errorResponse.status).toBe(500);
    });
  });

  describe('registrarCliente', () => {
    it('should send POST request to /clientes and return created client', () => {
      const nuevoClienteDTO: ClienteRegistroDTO = {
        tipoDocumento: 'CC',
        numeroDocumento: '1098765432',
        nombreCompleto: 'Juan Pérez',
        telefono: '3001234567',
        correo: 'juan.perez@example.com'
      };

      let result: Cliente | undefined;

      service.registrarCliente(nuevoClienteDTO).subscribe(cliente => {
        result = cliente;
      });

      const req = httpTesting.expectOne(request =>
        request.url.endsWith('/clientes') && request.method === 'POST'
      );
      expect(req.request.body).toEqual(nuevoClienteDTO);
      req.flush({ ...nuevoClienteDTO, idCliente: 10 });

      expect(result).toBeDefined();
      expect(result?.idCliente).toBe(10);
      expect(result?.nombreCompleto).toBe('Juan Pérez');
    });
  });

  describe('actualizarCliente', () => {
    it('should send PUT request to /clientes/:id and return updated client', () => {
      const datosActualizar: Partial<ClienteRegistroDTO> = {
        telefono: '3119876543',
        correo: 'juan.actualizado@example.com'
      };

      let result: Cliente | undefined;

      service.actualizarCliente(1, datosActualizar).subscribe(cliente => {
        result = cliente;
      });

      const req = httpTesting.expectOne(request =>
        request.url.endsWith('/clientes/1') && request.method === 'PUT'
      );
      expect(req.request.body).toEqual(datosActualizar);
      req.flush({ ...mockCliente, ...datosActualizar });

      expect(result).toBeDefined();
      expect(result?.telefono).toBe('3119876543');
      expect(result?.correo).toBe('juan.actualizado@example.com');
    });
  });
});
