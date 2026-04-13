import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-vendedor-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './vendedor-navbar.html',
  styleUrls: ['./vendedor-navbar.scss']
})
export class VendedorNavbar {
  constructor(private authService: AuthService) {}

  cerrarSesion(): void {
    this.authService.signOut().subscribe();
  }
}