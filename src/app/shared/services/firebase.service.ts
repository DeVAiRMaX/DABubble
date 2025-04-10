import { inject, Injectable } from '@angular/core';
import {
  Database,
  ref,
  set,
  get,
  push,
  child,
  listVal,
  orderByChild,
  query,
  update,
} from '@angular/fire/database';
import { User as CustomUser } from '../interfaces/user';
import { Observable, combineLatest, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Channel, ChannelWithKey } from '../interfaces/channel';
import { Message } from '../interfaces/message';
import { Thread, ThreadMessage } from '../interfaces/thread';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private database: Database = inject(Database);
  private router = inject(Router);

  constructor() {}

  saveUserData(user: CustomUser, password?: string): Observable<null> {
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
            displayName: user.displayName || user.email?.split('@')[0],
            email: user.email,
            channelKeys: [],
            password: password || '',
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

  async findUser(channelCreatorUid: string): Promise<string | null> {
    const userRef = ref(this.database, `users/${channelCreatorUid}`);
    try {
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val() as CustomUser;
        return userData.displayName;
      } else {
        throw new Error(
          `Der User mit der ID ${channelCreatorUid} wurde nicht gefunden.`
        );
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nutzerdaten:', error);
      throw error;
    }
  }

  sendMessage(
    channelKey: string,
    messageText: string,
    senderUid: string,
    senderDisplayName: string,
    senderAvatar?: string
  ): Observable<void> {
    if (!channelKey || !senderUid || !messageText) {
      return throwError(
        () =>
          new Error(
            'sendMessage: channelKey, senderUid und messageText dürfen nicht leer sein.'
          )
      );
    }

    const messagesRef = ref(this.database, `channels/${channelKey}/messages`);
    const newMessageRef = push(messagesRef);

    const newMessage: Message = {
      message: messageText,
      senderUid: senderUid,
      senderDisplayName: senderDisplayName,
      senderAvatar: senderAvatar || 'assets/img/character/4.png',
      time: Date.now(),
      reactions: [],
    };

    console.log(
      `[sendMessage] Sende Nachricht zu Channel ${channelKey}:`,
      newMessage
    );

    return from(set(newMessageRef, newMessage)).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[sendMessage] Fehler beim Senden der Nachricht an Channel ${channelKey}:`,
          error
        );
        return throwError(
          () => new Error('Nachricht senden fehlgeschlagen: ' + error.message)
        );
      })
    );
  }

  getMessagesForChannel(channelKey: string): Observable<Message[]> {
    if (!channelKey) {
      console.warn(
        '[getMessagesForChannel] channelKey ist leer, gebe leeres Array zurück.'
      );
      return of([]);
    }

    const messagesRef = ref(this.database, `channels/${channelKey}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('time'));

    return listVal<Message>(messagesQuery, { keyField: 'key' }).pipe(
      tap((messages) =>
        console.log(
          `[getMessagesForChannel] Nachrichten für ${channelKey} empfangen:`,
          messages.length
        )
      ),
      map((messages) => messages || []),
      catchError((error) => {
        console.error(
          `[getMessagesForChannel] Fehler beim Abrufen der Nachrichten für Channel ${channelKey}:`,
          error
        );

        return of([]);
      })
    );
  }

  createThread(
    originalMessage: Message,
    channelKey: string,
    creator: CustomUser
  ): Observable<string> {
    if (
      !originalMessage ||
      !originalMessage.key ||
      !channelKey ||
      !creator ||
      !creator.uid
    ) {
      console.error('[createThread] Ungültige Eingabedaten:', {
        originalMessage,
        channelKey,
        creator,
      });
      return throwError(
        () =>
          new Error(
            'createThread: Ungültige Eingabedaten. OriginalMessage (mit key), channelKey und creator (mit uid) sind erforderlich.'
          )
      );
    }

    const threadsRef = ref(this.database, 'Threads');
    const newThreadRef = push(threadsRef);
    const threadKey = newThreadRef.key;

    if (!threadKey) {
      return throwError(
        () =>
          new Error('createThread: Thread Key konnte nicht generiert werden.')
      );
    }

    console.log(
      `[createThread] Erstelle Thread mit Key: ${threadKey} für Nachricht ${originalMessage.key} in Channel ${channelKey}`
    );

    const timestamp = Date.now();
    const newThreadData: Omit<Thread, 'key' | 'threadMsg'> = {
      originalMessageKey: originalMessage.key,
      channelKey: channelKey,
      creatorUid: creator.uid,
      createdAt: timestamp,
      lastReplyAt: timestamp,
      replyCount: 0,
    };

    const originalMessageRef = ref(
      this.database,
      `channels/${channelKey}/messages/${originalMessage.key}`
    );
    const updateOriginalMessageOperation = from(
      update(originalMessageRef, {
        threadKey: threadKey,
        threadReplyCount: 0,
        threadLastReplyAt: timestamp,
      })
    );

    const createThreadOperation = from(set(newThreadRef, newThreadData));

    return createThreadOperation.pipe(
      switchMap(() => updateOriginalMessageOperation),
      map(() => {
        console.log(
          `[createThread] Thread ${threadKey} erfolgreich erstellt und Originalnachricht ${originalMessage.key} aktualisiert.`
        );
        return threadKey;
      }),
      catchError((error) => {
        console.error(
          `[createThread] Fehler beim Erstellen des Threads ${threadKey} oder beim Aktualisieren der Originalnachricht:`,
          error
        );
        return throwError(
          () => new Error('Thread-Erstellung fehlgeschlagen: ' + error.message)
        );
      })
    );
  }

  sendThreadMessage(
    threadKey: string,
    messageText: string,
    sender: CustomUser
  ): Observable<void> {
    if (
      !threadKey ||
      !messageText ||
      !sender ||
      !sender.uid ||
      !sender.displayName
    ) {
      return throwError(
        () =>
          new Error(
            'sendThreadMessage: threadKey, messageText und sender (mit uid, displayName) sind erforderlich.'
          )
      );
    }

    const threadMessagesRef = ref(
      this.database,
      `Threads/${threadKey}/threadMsg`
    );
    const newMessageRef = push(threadMessagesRef);
    const messageKey = newMessageRef.key;

    if (!messageKey) {
      return throwError(
        () =>
          new Error(
            'sendThreadMessage: Nachrichten Key konnte nicht generiert werden.'
          )
      );
    }

    const timestamp = Date.now();
    const newThreadMessage: Omit<ThreadMessage, 'key'> = {
      message: messageText,
      senderUid: sender.uid,
      senderDisplayName: sender.displayName,
      senderAvatar: sender.avatar || 'assets/img/character/bsp-avatar.png',
      time: timestamp,
      reactions: [],
      threadKey: threadKey,
    };

    console.log(
      `[sendThreadMessage] Sende Nachricht zu Thread ${threadKey}:`,
      newThreadMessage
    );

    const sendMessageOperation = from(set(newMessageRef, newThreadMessage));

    const threadRef = ref(this.database, `Threads/${threadKey}`);
    const updateThreadMetaOperation = from(get(threadRef)).pipe(
      switchMap((snapshot) => {
        if (snapshot.exists()) {
          const threadData = snapshot.val() as Thread;
          const currentCount = threadData.replyCount || 0;
          return from(
            update(threadRef, {
              lastReplyAt: timestamp,
              replyCount: currentCount + 1,
            })
          );
        } else {
          return throwError(
            () => new Error(`Thread ${threadKey} nicht gefunden für Update.`)
          );
        }
      })
    );

    const getOriginalMessageKeyOperation = from(
      get(ref(this.database, `Threads/${threadKey}/originalMessageKey`))
    ).pipe(
      switchMap((keySnapshot) => {
        if (keySnapshot.exists()) {
          const originalMessageKey = keySnapshot.val();
          const channelKeyRef = ref(
            this.database,
            `Threads/${threadKey}/channelKey`
          );
          return from(get(channelKeyRef)).pipe(
            map((channelKeySnapshot) => ({
              originalMessageKey,
              channelKey: channelKeySnapshot.val(),
            }))
          );
        } else {
          return throwError(
            () =>
              new Error(
                `OriginalMessageKey nicht in Thread ${threadKey} gefunden.`
              )
          );
        }
      })
    );

    const updateOriginalMessageMetaOperation =
      getOriginalMessageKeyOperation.pipe(
        switchMap(({ originalMessageKey, channelKey }) => {
          if (originalMessageKey && channelKey) {
            const originalMessageRef = ref(
              this.database,
              `channels/${channelKey}/messages/${originalMessageKey}`
            );

            return from(
              get(ref(this.database, `Threads/${threadKey}/replyCount`))
            ).pipe(
              switchMap((countSnapshot) => {
                const newCount = countSnapshot.exists()
                  ? countSnapshot.val()
                  : 1;
                return from(
                  update(originalMessageRef, {
                    threadReplyCount: newCount,
                    threadLastReplyAt: timestamp,
                  })
                );
              })
            );
          } else {
            console.warn(
              `[sendThreadMessage] Konnte Originalnachricht nicht updaten, da Key oder ChannelKey fehlt.`
            );
            return of(void 0);
          }
        })
      );

    return sendMessageOperation.pipe(
      switchMap(() => updateThreadMetaOperation),
      switchMap(() => updateOriginalMessageMetaOperation),
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[sendThreadMessage] Fehler beim Senden/Updaten der Nachricht für Thread ${threadKey}:`,
          error
        );
        return throwError(
          () =>
            new Error(
              'Thread-Nachricht senden/updaten fehlgeschlagen: ' + error.message
            )
        );
      })
    );
  }

  getThreadMessages(threadKey: string): Observable<ThreadMessage[]> {
    if (!threadKey) {
      console.warn(
        '[getThreadMessages] threadKey ist leer, gebe leeres Array zurück.'
      );
      return of([]);
    }

    const threadMessagesRef = ref(
      this.database,
      `Threads/${threadKey}/threadMsg`
    );

    const messagesQuery = query(threadMessagesRef, orderByChild('time'));

    return listVal<ThreadMessage>(messagesQuery, { keyField: 'key' }).pipe(
      tap((messages) =>
        console.log(
          `[getThreadMessages] Nachrichten für Thread ${threadKey} empfangen:`,
          messages?.length || 0
        )
      ),
      map((messages) => messages || []),
      catchError((error) => {
        console.error(
          `[getThreadMessages] Fehler beim Abrufen der Nachrichten für Thread ${threadKey}:`,
          error
        );
        return of([]);
      })
    );
  }
}
