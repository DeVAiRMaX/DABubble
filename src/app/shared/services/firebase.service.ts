import { inject, Injectable } from '@angular/core';
import { Database, ref, set, get, push, child } from '@angular/fire/database';
import { User } from '@angular/fire/auth';
import { Observable, combineLatest, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Channel, ChannelWithKey } from '../interfaces/channel';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  constructor(private database: Database) {}

  private router = inject(Router);

  saveUserData(user: User, password?: string): Observable<null> {
    if (!user || !user.uid) {
      console.error('[saveUserData] Ungültiges User-Objekt übergeben:', user);
      return throwError(
        () =>
          new Error(
            `saveUserData: Gültiges Benutzerobjekt mit UID erforderlich.`
          )
      );
    }
    const userRef = ref(this.database, `users/${user.uid}`);

    return from(get(userRef)).pipe(
      switchMap((snapshot) => {
        if (snapshot.exists()) {
          return of(null);
        } else {
          const initialUserData = {
            uid: user.uid,
            displayName:
              user.displayName || user.email?.split('@')[0] || 'Neuer Benutzer',
            email: user.email,
            channelKeys: [],
            password: password,
          };
          return from(set(userRef, initialUserData));
        }
      }),
      map(() => {
        return null;
      }),
      catchError((error) => {
        console.error(
          `saveUserData() Fehler Prüfen/Speichern der UID ${user.uid}:`,
          error
        );
        return throwError(
          () =>
            new Error(
              'Fehler beim Speichern der Benutzerdaten: ' + error.message
            )
        );
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

  createChannel(
    channelName: string,
    description: string,
    channelCreatorUid: string
  ): Observable<string> {
    console.log(
      `[createChannel] Attempting creation by user ${channelCreatorUid} for channel "${channelName}"`
    );
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
    console.log(`[createChannel] Generated new channel key: ${channelKey}`);

    const timestamp = Date.now();
    const newChannel: Channel = {
      channelName: channelName,
      members: [channelCreatorUid],
      description: description,
      messages: [
        {
          message: `Welcome to #${channelName}`,
          reactions: [],
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
          `[createChannel] Step 1: Channel data set for key ${channelKey}.`
        )
      ),
      switchMap(() => {
        return this.addChannelKeyToUser(channelCreatorUid, channelKey);
      }),
      map(() => {
        return channelKey;
      }),
      catchError((error) => {
        console.error(
          `[createChannel] Error during channel creation process for "${channelName}":`,
          error
        );
        return throwError(() => new Error('Channel creation failed: ' + error));
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
          const channelObservables = userData.channelKeys.map((channelKey) =>
            this.getChannel(channelKey).pipe(
              map((channelData) => {
                if (channelData) {
                  return { ...channelData, key: channelKey } as ChannelWithKey;
                }
                return null;
              })
            )
          );

          return combineLatest(channelObservables).pipe(
            map(
              (channelsWithPossibleNulls) =>
                channelsWithPossibleNulls.filter(
                  (channel) => channel !== null
                ) as ChannelWithKey[]
            )
          );
        } else {
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
    console.log(
      `[addChannelKeyToUser] Attempting to add key ${channelKey} to user ${uid}`
    );
    if (!uid || !channelKey) {
      return throwError(
        () =>
          new Error('addChannelKeyToUser: uid and channelKey must be provided.')
      );
    }
    const userChannelKeysRef = ref(this.database, `users/${uid}/channelKeys`);

    return from(get(userChannelKeysRef)).pipe(
      switchMap((snapshot) => {
        const currentKeys: string[] = snapshot.exists() ? snapshot.val() : [];
        console.log(
          `[addChannelKeyToUser] User ${uid} current keys:`,
          currentKeys
        );

        if (currentKeys.includes(channelKey)) {
          console.log(
            `[addChannelKeyToUser] Key ${channelKey} already exists for user ${uid}. Skipping add.`
          );
          return of(void 0);
        } else {
          const updatedKeys: string[] = [...currentKeys, channelKey];
          console.log(
            `[addChannelKeyToUser] Key ${channelKey} is new. Updating keys for user ${uid} to:`,
            updatedKeys
          );
          return from(set(userChannelKeysRef, updatedKeys));
        }
      }),
      map(() => {
        console.log(
          `[addChannelKeyToUser] Operation completed for user ${uid}, key ${channelKey}.`
        );
        return;
      }),
      catchError((error) => {
        console.error(
          `[addChannelKeyToUser] Error adding channel key ${channelKey} to user ${uid}:`,
          error
        );
        return throwError(
          () => new Error('Failed to add channel key to user: ' + error)
        );
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
        channelKeys: ['PLACEHOLDER'],
        avatar: './assets/img/character/PLACEHOLDER',
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

  updateAvatar(choosenAvatar: string, uid: string): Promise<void> {
    const userRef = ref(this.database, `users/${uid}/avatar`);

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
