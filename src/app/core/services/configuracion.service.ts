import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfiguracionParque } from '../models/configuracion.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/configuracion`;

  getConfiguracion(): Observable<ConfiguracionParque> {
    return this.http.get<ConfiguracionParque>(this.apiUrl);
  }

  updateConfiguracion(config: ConfiguracionParque): Observable<ConfiguracionParque> {
    return this.http.put<ConfiguracionParque>(this.apiUrl, config);
  }
}
