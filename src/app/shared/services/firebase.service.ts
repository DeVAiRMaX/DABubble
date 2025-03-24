import { inject, Injectable } from '@angular/core';
import {
  Database,
  ref,
  set,
  get,
  Unsubscribe,
  push,
} from '@angular/fire/database';
import { User } from '@angular/fire/auth';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Channel } from '../interfaces/channel';

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

    // MARK: - User Data Functions

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

  getUserData(uid: string): Observable<{
    displayName: string;
    email: string;
    uid: string;
    // channels: [];
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
            // channels: [];
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
    };

    return from(set(newChannelRef, newChannel)).pipe(
      map(() => channelKey),
      catchError((error) => {
        console.error('Fehler beim Erstellen des Channels:', error);
        return throwError(() => error);
      })
    );
  }

  // getTime(timestamp: number) {
  //   const date = new Date(timestamp)
  //   console.log(date.toLocaleString());
  // }
}
