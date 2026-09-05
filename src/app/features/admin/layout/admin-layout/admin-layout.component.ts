import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatSidenavModule, MatToolbarModule, MatIconModule, MatListModule, MatButtonModule
  ],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);
  
  logout() {
    this.authService.logout();
  }
}
