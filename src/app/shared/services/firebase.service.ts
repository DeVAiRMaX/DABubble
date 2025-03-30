import { inject, Injectable } from '@angular/core';
import {
  Database,
  ref,
  set,
  get,
  push,
  child,
  query,
  orderByChild,
  equalTo,
} from '@angular/fire/database';
import { user, User } from '@angular/fire/auth';
import { Observable, combineLatest, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Channel, ChannelWithKey } from '../interfaces/channel';
import { Router } from '@angular/router';
import { where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  constructor(private database: Database) {}

  private router = inject(Router);

  saveUserData(user: User): Observable<null> {
    if (!user) {
      return throwError(
        () => new Error(`saveUserData: Benutzerobjekt darf nicht ${user} sein.`)
      );
    }

    const userRef = ref(this.database, `users/${user.uid}`);

    // MARK: - User Data Functions

    return from(
      set(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        channelKeys: ['-OMHiw5zKaBgMPOxnzaC', '-OMIPeYGF4ha3FjUK4xH'],
      })
    ).pipe(
      map(() => null),
      catchError((error) => {
        console.error('Fehler beim Speichern der Benutzerdaten:', error);
        return throwError(() => error);
      })
    );
  }

  getUserData(uid: string): Observable<{
    displayName: string;
    email: string;
    uid: string;
    channelKeys: string[];
  } | null> {
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
            channelKeys: string[];
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

  // MARK: - Channel Functions

  createChannel(
    channelName: string,
    description: string,
    channelCreatorUid: string
  ): Observable<string> {
    if (!channelName || !channelCreatorUid) {
      return throwError(
        () =>
          new Error(
            'createChannel: channelName und channelCreatorUid dürfen nicht leer sein.'
          )
      );
    }

    const channelsRef = ref(this.database, 'channels');
    const newChannelRef = push(channelsRef);
    const channelKey = newChannelRef.key;

    if (!channelKey) {
      return throwError(
        () =>
          new Error('createChannel: Channel Key konnte nicht generiert werden.')
      );
    }

    let timestamp = Date.now();
    // const formattedTime = this.getTime(timestamp);

    const newChannel: Channel = {
      channelName: channelName,
      members: [`${channelCreatorUid}`],
      description: `${description}`,
      messages: [
        {
          message: `Welcome to ${channelName}`,
          reactions: ['U+1F973'],
          sender: `DABubble`,
          time: timestamp,
        },
      ],
      private: false,
    };

    const createChannelOperation = from(set(newChannelRef, newChannel));

    return createChannelOperation.pipe(
      tap(() =>
        console.log(
          `[createChannel] Operation 1 (set channel ${channelKey}) erfolgreich.`
        )
      ),
      switchMap(() => {
        console.log(
          `[createChannel] Rufe Operation 2 (addChannelKeyToUser) für User ${channelCreatorUid}, Key ${channelKey} auf.`
        );
        return this.addChannelKeyToUser(channelCreatorUid, channelKey);
      }),
      map(() => {
        console.log(
          `[createChannel] Operation 2 (addChannelKeyToUser) erfolgreich abgeschlossen.`
        );
        return channelKey;
      }),
      catchError((error) => {
        console.error('[createChannel] Fehler im Verkettungsprozess:', error);
        return throwError(() => error);
      })
    );
  }

  getChannel(channelKey: string): Observable<Channel | null> {
    if (!channelKey) {
      return throwError(
        () => new Error('getChannel: channelKey darf nicht leer sein.')
      );
    }

    const dbRef = ref(this.database);

    return from(get(child(dbRef, `channels/${channelKey}`))).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return snapshot.val() as Channel;
        } else {
          return null;
        }
      }),
      catchError((error) => {
        console.error('Fehler beim Abrufen des Channels:', error);
        return throwError(() => error);
      })
    );
  }

  getChannelsForUser(uid: string): Observable<ChannelWithKey[]> {
    // Rückgabetyp angepasst
    if (!uid) {
      return throwError(
        () => new Error('getChannelsForUser: UID darf nicht leer sein.')
      );
    }

    return this.getUserData(uid).pipe(
      switchMap((userData) => {
        if (
          userData &&
          userData.channelKeys &&
          userData.channelKeys.length > 0
        ) {
          // Erstelle Observables, die Channel holen UND den Key hinzufügen
          const channelObservables = userData.channelKeys.map((channelKey) =>
            this.getChannel(channelKey).pipe(
              map((channelData) => {
                if (channelData) {
                  // Füge den Key zum Channel-Objekt hinzu
                  return { ...channelData, key: channelKey } as ChannelWithKey;
                }
                return null; // Behalte null bei, falls Channel nicht gefunden wurde
              })
            )
          );

          // Kombiniere die Ergebnisse
          return combineLatest(channelObservables).pipe(
            map(
              (channelsWithPossibleNulls) =>
                // Filtere null-Werte heraus
                channelsWithPossibleNulls.filter(
                  (channel) => channel !== null
                ) as ChannelWithKey[]
            )
          );
        } else {
          // Keine Channel-Keys gefunden, leeres Array zurückgeben
          return of([]);
        }
      }),
      catchError((error) => {
        console.error(
          'Fehler beim Abrufen der Kanäle für den Benutzer:',
          error
        );
        return throwError(() => error);
        return of([]);
      })
    );
  }

  getUserChannelKeys(uid: string): Observable<string[]> {
    return this.getUserData(uid).pipe(
      map((userData) => {
        if (userData && userData.channelKeys) {
          return userData.channelKeys;
        } else {
          return [];
        }
      }),
      catchError((error) => {
        console.error('Error getting user channel keys:', error);
        return throwError(() => error);
      })
    );
  }

  addChannelKeyToUser(uid: string, channelKey: string): Observable<void> {
    if (!uid || !channelKey) {
      return throwError(
        () =>
          new Error('addChannelKeyToUser: uid and channelKey must be provided.')
      );
    }

    const userRef = ref(this.database, `users/${uid}`);

    return this.getUserData(uid).pipe(
      switchMap((userData) => {
        const currentKeys =
          userData && userData.channelKeys ? userData.channelKeys : [];
        if (currentKeys.includes(channelKey)) {
          return of(null);
        }

        const updatedKeys: string[] = [...currentKeys, channelKey];
        return from(set(child(userRef, 'channelKeys'), updatedKeys));
      }),
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error('Error adding channel key to user:', error);
        return throwError(() => error);
      })
    );
  }

  removeChannelKeyFromUser(uid: string, channelKey: string): Observable<void> {
    if (!uid || !channelKey) {
      return throwError(
        () =>
          new Error(
            'removeChannelKeyFromUser: uid and channelKey must be provided'
          )
      );
    }

    const userRef = ref(this.database, `users/${uid}`);

    return this.getUserData(uid).pipe(
      switchMap((userData) => {
        if (!userData || !userData.channelKeys) {
          return of(null);
        }

        const updatedKeys = userData.channelKeys.filter(
          (key) => key !== channelKey
        );
        return from(set(child(userRef, 'channelKeys'), updatedKeys));
      }),
      map(() => {
        return;
      }),
      catchError((error) => {
        console.error('Error removing channel key from user:', error);
        return throwError(() => error);
      })
    );
  }

  creatNewUser(newUser: User): Promise<string> {
    const userRef = ref(this.database, `users/`);
    const newUserRef = push(userRef);
    const userId = newUserRef.key;

    if (userId) {
      const userData = {
        ...newUser,
        uid: userId,
        channelKeys: ['PLACEHOLDER'], // Beispiel Channelkey
        avatar: './assets/img/character/PLACEHOLDER', // Beispiel Avatar
      };

      return set(newUserRef, userData)
        .then(() => {
          console.log('User created successfully');
          return userId;
        })
        .catch((error) => {
          console.error('Error creating user:', error);
          return Promise.reject(error);
        });
    } else {
      console.error('Failed to create user ID');
      return Promise.reject('Failed to create user ID');
    }
  }

  updateAvatar(choosenAvatar: string, id: string): Promise<void> {
    const userRef = ref(this.database, `users/${id}/avatar`);

    return set(userRef, choosenAvatar)
      .then(() => {
        console.log('Avatar updated successfully');
      })
      .catch((error) => {
        console.error('Error updating avatar:', error);
        return Promise.reject(error);
      });
  }

  resiveUserData(id: string): Promise<any> {
    const userRef = ref(this.database, `users/${id}`);

    return get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const displayName = snapshot.val().displayName;
          const userData = snapshot.val();
          return userData;
        } else {
          console.log('No user data found');
          return null;
        }
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
        return null;
      });
  }

  checkIfUserExists(
    userEmail: string,
    userPassword: string
  ): Promise<{ userExists: boolean; userKey?: string }> {
    const accountsRef = ref(this.database, '/users');

    return get(accountsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const users = snapshot.val();
          for (const key in users) {
            if (
              users[key].email === userEmail &&
              users[key].password === userPassword
            ) {
              return { userExists: true, userKey: key };
            }
          }
          return { userExists: false };
        } else {
          return { userExists: false };
        }
      })
      .catch((error) => {
        return { userExists: false };
      });
  }
}
