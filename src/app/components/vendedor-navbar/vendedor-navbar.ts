import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-vendedor-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './vendedor-navbar.html',
  styleUrls: ['./vendedor-navbar.scss']
})
export class VendedorNavbar {}