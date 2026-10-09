import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../models/usuario.model';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsuarioService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(UsuarioService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all users', () => {
    const mockUsuarios: Usuario[] = [
      { id: 1, nombre: 'Carlos Gomez', correo: 'carlos@tdn.com.co', rol: 'OPERARIO', estado: 'ACTIVO' }
    ];

    service.getAll().subscribe(usuarios => {
      expect(usuarios.length).toBe(1);
      expect(usuarios[0].correo).toBe('carlos@tdn.com.co');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios'));
    expect(req.request.method).toBe('GET');
    req.flush(mockUsuarios);
  });

  it('should get user by id', () => {
    service.getById(1).subscribe(user => {
      expect(user.id).toBe(1);
      expect(user.nombre).toBe('Carlos Gomez');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, nombre: 'Carlos Gomez', correo: 'carlos@tdn.com.co', rol: 'OPERARIO' });
  });

  it('should create user via POST', () => {
    const newUser: Usuario = { nombre: 'Laura', correo: 'laura@tdn.com.co', rol: 'TAQUILLERO' };
    service.create(newUser).subscribe(user => {
      expect(user.id).toBe(2);
    });

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios') && !request.url.includes('/1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);
    req.flush({ ...newUser, id: 2 });
  });

  it('should update user via PUT', () => {
    const updateUser: Usuario = { id: 3, nombre: 'Laura Actualizada', correo: 'laura@tdn.com.co', rol: 'TAQUILLERO' };
    service.update(3, updateUser).subscribe(user => {
      expect(user.nombre).toBe('Laura Actualizada');
    });

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios/3'));
    expect(req.request.method).toBe('PUT');
    req.flush(updateUser);
  });

  it('should delete user via DELETE', () => {
    service.delete(3).subscribe();

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios/3'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should handle HTTP error when API fails', () => {
    let errorResponse: any;
    service.getAll().subscribe({
      next: () => {},
      error: (err) => { errorResponse = err; }
    });

    const req = httpTesting.expectOne(request => request.url.includes('/usuarios'));
    req.flush('Database error', { status: 500, statusText: 'Server Error' });

    expect(errorResponse.status).toBe(500);
  });
});
