import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  set,
  get,
  onValue,
  Unsubscribe,
} from '@angular/fire/database';
import { User } from '@angular/fire/auth';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private unsubscribeUser: Unsubscribe | null = null;

  constructor(private database: Database) {}

  saveUserData(user: User): Observable<null> {
    if (!user) {
      return throwError(
        () => new Error(`saveUserData: Benutzerobjekt darf nicht ${user} sein.`)
      );
    }

    const userRef = ref(this.database, `users/${user.uid}`);

    return from(
      set(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      })
    ).pipe(
      map(() => null),
      catchError((error) => {
        console.error('Fehler beim Speichern der Benutzerdaten:', error);
        return throwError(() => error);
      })
    );
  }

  unsubscribeUserData(): void {
    if (this.unsubscribeUser) {
      this.unsubscribeUser();
      this.unsubscribeUser = null;
    }
  }

  getUserData(
    uid: string
  ): Observable<{ displayName: string; email: string; uid: string } | null> {
    if (!uid) {
      return throwError(
        () => new Error('getUserData: UID darf nicht leer sein.')
      );
    }

    const userRef = ref(this.database, `users/${uid}`);
    return from(get(userRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return snapshot.val() as {
            displayName: string;
            email: string;
            uid: string;
          };
        } else {
          return null;
        }
      }),
      catchError((error) => {
        console.error('Fehler beim Lesen der Benutzerdaten:', error);
        return throwError(() => error);
      })
    );
  }
}
