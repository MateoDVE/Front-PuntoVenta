import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminNavbar } from "./components/admin-navbar/admin-navbar";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AdminNavbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend-puntoventa');
  
}
