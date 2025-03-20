import { Component, inject, OnInit } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-auth-status',
  standalone: true,
  imports: [],
  templateUrl: './auth-status.component.html',
  styleUrl: './auth-status.component.scss',
})
export class AuthStatusComponent {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  user$: Observable<User | null> = authState(this.auth);

  ngOnInit(): void {
    this.user$.subscribe((user) => {
      console.log('Authentifizierungsstatus geändert:', user);
      if (user) {
        // Benutzer ist angemeldet
      } else {
        // Benutzer ist abgemeldet
      }
    });
  }

  async logout() {
    try {
      await this.auth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  }
}
