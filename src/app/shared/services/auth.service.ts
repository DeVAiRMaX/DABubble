import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  User as AuthUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from '@angular/fire/auth';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { FirebaseService } from './firebase.service';
import { Database, ref, objectVal, update } from '@angular/fire/database';
import { User } from '../interfaces/user';
import { get, set } from 'firebase/database';
import { VariablesService } from '../../variables.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private firebaseService: FirebaseService = inject(FirebaseService);
  public database: Database = inject(Database);
  private variablesService = inject(VariablesService);

  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private guestUserSubject = new BehaviorSubject<AuthUser | null>(null);
  guestUser$ = this.guestUserSubject.asObservable();

  private uidSubject = new BehaviorSubject<string | null>(null);
  uid$ = this.uidSubject.asObservable();

  constructor() {
    authState(this.auth)
      .pipe(
        switchMap((authUser: AuthUser | null) => {
          if (authUser) {
            const userRef = ref(this.database, `users/${authUser.uid}`);
            return objectVal<User>(userRef).pipe(
              map((dbUser) => {
                return {
                  uid: authUser.uid,
                  email: authUser.email,
                  displayName: dbUser?.displayName ?? authUser.displayName,
                  avatar: dbUser?.avatar,
                  channelKeys: dbUser?.channelKeys ?? [],
                } as User;
              }),
              catchError((error) => {
                console.error(
                  'Fehler beim Abrufen der User-Daten aus Realtime DB:',
                  error
                );
                return of({
                  uid: authUser.uid,
                  email: authUser.email,
                  displayName: authUser.displayName,
                  avatar: undefined,
                  channelKeys: [],
                } as User);
              })
            );
          } else {
            return of(null);
          }
        })
      )
      .subscribe((user) => {
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
            if (this.userSubject.value?.avatar) {
              this.router.navigate(['/dashboard']);
            } else {
              this.router.navigate(['/avatar']);
            }
            this.variablesService.toggleLoginStatus();
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

  async loginAsGuest(): Promise<void> {
    try {
      const result = await signInAnonymously(this.auth);
      const firebaseUser = result.user;

      if (firebaseUser) {
        await updateProfile(firebaseUser, {
          displayName: 'Gast',
          photoURL: '/assets/img/character/bsp-avatar.png',
        });

        const guestUser: User = {
          uid: firebaseUser.uid,
          email: null,
          displayName: 'Gast',
          avatar: '/assets/img/character/bsp-avatar.png',
          channelKeys: [],
        };

        // Benutzer in DB speichern, falls noch nicht vorhanden
        const userRef = ref(this.database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
          await set(userRef, guestUser);
        }

        // Test-Channel zuweisen oder erstellen
        this.firebaseService
          .getOrCreateTestChannelForGuest(firebaseUser.uid)
          .subscribe({
            next: () => {
              // Benutzer neu laden
              objectVal<User>(userRef).subscribe((dbUser) => {
                this.userSubject.next({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: dbUser?.displayName ?? firebaseUser.displayName,
                  avatar:
                    dbUser?.avatar ?? '/assets/img/character/bsp-avatar.png',
                  channelKeys: dbUser?.channelKeys ?? [],
                });

                // Optional: interne Variable setzen und Weiterleitung
                this.variablesService.setUserIsAGuest(true);
                this.router.navigate(['/dashboard']);
              });
            },
            error: (err) => {
              console.error('Fehler beim Testchannel:', err);
            },
          });
      }
    } catch (error) {
      console.error('Fehler bei der Gast-Anmeldung:', error);
      throw error;
    }
  }

  async registerWithEmailPassword(
    email: string,
    password: string,
    displayName: string
  ): Promise<void> {
    try {
      const result: UserCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      try {
        await updateProfile(result.user, { displayName: displayName });
      } catch (profileError) {
        console.error(
          'Error updating Firebase Auth profile displayName:',
          profileError
        );
      }
      this.firebaseService.saveUserData(result.user, password).subscribe({
        next: () => {
          this.router.navigate(['/avatar']);
        },
        error: (dbError) => {
          console.error(
            'Error saving manual registration user data to database:',
            dbError
          );
          console.warn('Proceeding to avatar despite database save error.');
        },
      });
    } catch (authError: any) {
      console.error('Error during Firebase Auth registration:', authError);
      throw authError;
    }
  }

  async loginWithEmailPassword(email: string, password: string) {
    try {
      const result: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      await this.variablesService.setLoginStatusToTrue();
    
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 700);
    } catch (error: any) {
      console.error('Error during email/password login:', error);

      throw error;
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

  updateUserName(currentUser: string, displayName: string) {
    const userRef = ref(this.database, `users/${currentUser}/displayName`);
    return set(userRef, displayName);
  }

  updateChannel(
    currentChannel: string,
    field: string,
    value: string
  ): Promise<void> {
    const channelRef = ref(this.database, `channels/${currentChannel}`);
    return update(channelRef, { [field]: value });
  }

  getMembersData(members: string[]): Promise<any[]> {
    const promises = members.map((memberId) => {
      const memberRef = ref(this.database, `users/${memberId}`);
      return get(memberRef).then((snapshot) => {
        if (snapshot.exists()) {
          const memberData = snapshot.val();
          return memberData;
        } else {
          return null;
        }
      });
    });

    return Promise.all(promises).then((results) =>
      results.filter((data) => data !== null)
    );
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(this.auth, email);
    } catch (error) {
      throw error;
    }
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      await confirmPasswordReset(this.auth, code, newPassword);
    } catch (error) {
      console.error('Fehler beim Bestätigen des Passwort-Resets:', error);
      throw error;
    }
  }

  async verifyPasswordResetCode(code: string): Promise<string> {
    try {
      const email = await verifyPasswordResetCode(this.auth, code);
      return email;
    } catch (error) {
      console.error('Ungültiger oder abgelaufener Passwort-Reset-Code:', error);
      throw error;
    }
  }
}
