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
});
