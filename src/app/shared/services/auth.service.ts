import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private firebaseService: FirebaseService = inject(FirebaseService);

  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private uidSubject = new BehaviorSubject<string | null>(null);
  uid$ = this.uidSubject.asObservable();

  constructor() {
    authState(this.auth).subscribe((user) => {
      this.userSubject.next(user);
      this.uidSubject.next(user ? user.uid : null);
    });
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      if (result.user) {
        this.firebaseService.saveUserData(result.user).subscribe({
          next: () => {
            console.log('userdata gespeichert.');
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            console.error('Fehler beim Speichern der Benutzerdaten:', error);
          },
        });
      } else {
        console.warn('Kein Benutzer gefunden.');
      }
    } catch (error: any) {
      console.error('Fehler bei der Google-Anmeldung:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        window.location.reload();
      }
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  getCurrentUserUID(): string | null {
    return this.uidSubject.value;
  }
}
