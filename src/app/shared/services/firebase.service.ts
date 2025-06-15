import { inject, Injectable } from '@angular/core';
import {
  Database,
  ref,
  onValue,
  set,
  get,
  push,
  child,
  listVal,
  orderByChild,
  query,
  update,
  serverTimestamp,
} from '@angular/fire/database';
import { User as CustomUser, userData } from '../interfaces/user';
import { Observable, combineLatest, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {
  Channel,
  ChannelWithKey,
  ChannelNameAndKey,
} from '../interfaces/channel';
import { Message, Reaction } from '../interfaces/message';
import { Thread, ThreadMessage } from '../interfaces/thread';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private database: Database = inject(Database);
  private router = inject(Router);
  public channelListDatabase: string[] = [];

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

  async updateChannelMember(channelKey: string, uid: string): Promise<void> {
    const membersRef = ref(this.database, `channels/${channelKey}/members`);
    const userRef = ref(this.database, `users/${uid}/channelKeys`);

    const channelMembersSnapshot = await get(membersRef);
    let currentMembers: string[] = [];

    if (channelMembersSnapshot.exists()) {
      const data = channelMembersSnapshot.val();
      currentMembers = Array.isArray(data) ? data : Object.values(data);
    }

    const userChannelKeysSnapshot = await get(userRef);
    let userChannelKeys: string[] = [];

    if (userChannelKeysSnapshot.exists()) {
      const data = userChannelKeysSnapshot.val();
      userChannelKeys = Array.isArray(data) ? data : Object.values(data);
    }

    if (!currentMembers.includes(uid)) {
      currentMembers.push(uid);
    }

    if (!userChannelKeys.includes(channelKey)) {
      userChannelKeys.push(channelKey);
    }

    await Promise.all([
      set(membersRef, currentMembers),
      set(userRef, userChannelKeys),
    ]);
  }

  async removeUserChannel(channelKey: string, uid: string): Promise<void> {
    const membersRef = ref(this.database, `channels/${channelKey}/members`);
    const userRef = ref(this.database, `users/${uid}/channelKeys`);

    const [membersSnap, userChannelsSnap] = await Promise.all([
      get(membersRef),
      get(userRef),
    ]);

    let updatedMembers: string[] = [];
    let updatedUserChannels: string[] = [];

    if (membersSnap.exists()) {
      const data = membersSnap.val();
      const members = Array.isArray(data) ? data : Object.values(data);
      updatedMembers = members.filter((memberUid: string) => memberUid !== uid);
    }

    if (userChannelsSnap.exists()) {
      const data = userChannelsSnap.val();
      const userChannels = Array.isArray(data) ? data : Object.values(data);
      updatedUserChannels = userChannels.filter(
        (key: string) => key !== channelKey
      );
    }

    await Promise.all([
      set(membersRef, updatedMembers),
      set(userRef, updatedUserChannels),
    ]);
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

        if (currentKeys.includes(channelKey)) {
          return of(void 0);
        } else {
          const updatedKeys: string[] = [...currentKeys, channelKey];
          return from(set(userChannelKeysRef, updatedKeys));
        }
      }),
      map(() => {
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

    return set(userRef, choosenAvatar).catch((error) => {
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
      senderAvatar: senderAvatar,
      time: Date.now(),
      reactions: [],
    };

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
      senderAvatar: sender.avatar,
      time: timestamp,
      reactions: [],
      threadKey: threadKey,
    };

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

  getDirectMessages(conversationId: string): Observable<Message[]> {
    if (!conversationId) {
      console.warn(
        '[getDirectMessages] conversationId ist leer, gebe leeres Array zurück.'
      );
      return of([]);
    }

    const messagesRef = ref(
      this.database,
      `direct-messages/${conversationId}/messages`
    );
    const messagesQuery = query(messagesRef, orderByChild('time'));

    return listVal<Message>(messagesQuery, { keyField: 'key' }).pipe(
      map((messages) => messages || []),
      catchError((error) => {
        console.error(
          `[getDirectMessages] Fehler beim Abrufen der Nachrichten für DM ${conversationId}:`,
          error
        );
        if (error.message.includes('index') && error.message.includes('time')) {
          console.warn(
            `Firebase-Fehler: Fehlender Index für 'time' im Pfad /direct-messages/${conversationId}/messages. Bitte die Datenbankregeln anpassen.`
          );
        }
        return of([]);
      })
    );
  }

  sendDirectMessage(
    conversationId: string,
    messageText: string,
    sender: CustomUser
  ): Observable<void> {
    if (!conversationId || !messageText || !sender || !sender.uid) {
      return throwError(
        () =>
          new Error(
            'sendDirectMessage: conversationId, messageText und sender (mit uid) sind erforderlich.'
          )
      );
    }

    const messagesRef = ref(
      this.database,
      `direct-messages/${conversationId}/messages`
    );
    const newMessageRef = push(messagesRef);
    const timestamp = Date.now();
    const newMessageData: Omit<Message, 'key'> = {
      message: messageText,
      senderUid: sender.uid,
      senderDisplayName: sender.displayName || '',
      senderAvatar: sender.avatar,
      time: timestamp,
      reactions: [],
    };

    const sendMessageOperation = from(set(newMessageRef, newMessageData));
    const conversationMetaRef = ref(
      this.database,
      `direct-messages/${conversationId}`
    );
    const updateMetaOperation = from(
      update(conversationMetaRef, {
        lastMessageTimestamp: timestamp,
      })
    );

    return sendMessageOperation.pipe(
      switchMap(() => updateMetaOperation),
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[sendDirectMessage] Fehler beim Senden/Updaten der DM ${conversationId}:`,
          error
        );
        return throwError(
          () =>
            new Error(
              'Direktnachricht senden/updaten fehlgeschlagen: ' + error.message
            )
        );
      })
    );
  }

  ensureDirectMessageConversation(
    uid1: string,
    uid2: string
  ): Observable<string> {
    if (!uid1 || !uid2 || uid1 === uid2) {
      return throwError(() => new Error('Ungültige UIDs für DM-Konversation.'));
    }
    const conversationId = [uid1, uid2].sort().join('_');
    const conversationRef = ref(
      this.database,
      `direct-messages/${conversationId}`
    );

    return from(get(conversationRef)).pipe(
      switchMap((snapshot) => {
        if (snapshot.exists()) {
          return of(conversationId);
        } else {
          const initialConversationData = {
            participants: {
              [uid1]: true,
              [uid2]: true,
            },
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
          };
          const createConvOp = from(
            set(conversationRef, initialConversationData)
          );
          const user1Ref = ref(
            this.database,
            `users/${uid1}/directMessageKeys/${conversationId}`
          );
          const user2Ref = ref(
            this.database,
            `users/${uid2}/directMessageKeys/${conversationId}`
          );
          const updateUser1Op = from(set(user1Ref, true));
          const updateUser2Op = from(set(user2Ref, true));

          return createConvOp.pipe(
            switchMap(() => updateUser1Op),
            switchMap(() => updateUser2Op),
            map(() => conversationId)
          );
        }
      }),
      catchError((error) => {
        console.error(
          `[ensureDirectMessageConversation] Fehler beim Sicherstellen/Erstellen der DM ${conversationId}:`,
          error
        );
        return throwError(
          () => new Error('Fehler bei DM-Konversation: ' + error.message)
        );
      })
    );
  }

  getUserDirectMessageKeys(uid: string): Observable<string[]> {
    if (!uid) return of([]);
    const dmKeysRef = ref(this.database, `users/${uid}/directMessageKeys`);
    return from(get(dmKeysRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          const keysObject = snapshot.val();
          return Object.keys(keysObject);
        } else {
          return [];
        }
      }),
      catchError((error) => {
        console.error(
          `[getUserDirectMessageKeys] Fehler beim Abrufen der DM-Keys für User ${uid}:`,
          error
        );
        return of([]);
      })
    );
  }

  getAllUsers(): Observable<userData[]> {
    const usersRef = ref(this.database, 'users');
    return listVal<userData>(usersRef, { keyField: 'uid' }).pipe(
      map((users) => users || []),
      catchError((error) => {
        console.error(
          '[getAllUsers] Fehler beim Abrufen aller Benutzer:',
          error
        );
        return of([]);
      })
    );
  }

  async getDatabaseData(): Promise<any> {
    const dbRef = ref(this.database);
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return {};
    }
  }

  toggleReaction(
    channelKey: string,
    messageKey: string,
    emoji: string,
    user: CustomUser
  ): Observable<void> {
    if (!channelKey || !messageKey || !emoji || !user || !user.uid) {
      return throwError(() => new Error('toggleReaction: Ungültige Eingabe.'));
    }

    const reactionsRef = ref(
      this.database,
      `channels/${channelKey}/messages/${messageKey}/reactions`
    );

    return from(get(reactionsRef)).pipe(
      switchMap((snapshot) => {
        const currentReactions: Reaction[] = snapshot.exists()
          ? snapshot.val()
          : [];
        let updatedReactions: Reaction[];

        const existingReactionIndex = currentReactions.findIndex(
          (r) => r.emoji === emoji && r.userId === user.uid
        );

        if (existingReactionIndex > -1) {
          updatedReactions = [
            ...currentReactions.slice(0, existingReactionIndex),
            ...currentReactions.slice(existingReactionIndex + 1),
          ];
        } else {
          const newReaction: Reaction = {
            emoji: emoji,
            userId: user.uid,
            userName: user.displayName || 'Unbekannt',
          };
          updatedReactions = [...currentReactions, newReaction];
        }
        return from(set(reactionsRef, updatedReactions));
      }),
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[toggleReaction] Fehler beim Aktualisieren der Reaktion für Nachricht ${messageKey}:`,
          error
        );
        return throwError(
          () => new Error('Fehler beim Aktualisieren der Reaktion.')
        );
      })
    );
  }

  toggleThreadReaction(
    threadKey: string,
    messageKey: string,
    emoji: string,
    user: CustomUser
  ): Observable<void> {
    if (!threadKey || !messageKey || !emoji || !user || !user.uid) {
      return throwError(
        () => new Error('toggleThreadReaction: Ungültige Eingabe.')
      );
    }

    const reactionsRef = ref(
      this.database,
      `Threads/${threadKey}/threadMsg/${messageKey}/reactions`
    );

    return from(get(reactionsRef)).pipe(
      switchMap((snapshot) => {
        const currentReactionsVal = snapshot.val();
        let currentReactions: Reaction[] = [];
        if (Array.isArray(currentReactionsVal)) {
          currentReactions = currentReactionsVal;
        } else if (
          typeof currentReactionsVal === 'object' &&
          currentReactionsVal !== null
        ) {
          currentReactions = Object.values(currentReactionsVal);
        }

        let updatedReactions: Reaction[];
        const existingReactionIndex = currentReactions.findIndex(
          (r) => r.emoji === emoji && r.userId === user.uid
        );

        if (existingReactionIndex > -1) {
          updatedReactions = [
            ...currentReactions.slice(0, existingReactionIndex),
            ...currentReactions.slice(existingReactionIndex + 1),
          ];
        } else {
          const newReaction: Reaction = {
            emoji: emoji,
            userId: user.uid,
            userName: user.displayName || 'Unbekannt',
          };
          updatedReactions = [...currentReactions, newReaction];
        }
        const reactionsToSet =
          updatedReactions.length > 0 ? updatedReactions : null;
        return from(set(reactionsRef, reactionsToSet));
      }),
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[toggleThreadReaction] Fehler bei Reaktion für Thread-Msg ${messageKey} in Thread ${threadKey}:`,
          error
        );
        return throwError(
          () => new Error('Fehler beim Aktualisieren der Thread-Reaktion.')
        );
      })
    );
  }

  updateMessage(
    channelKey: string,
    messageKey: string,
    newText: string
  ): Observable<void> {
    if (!channelKey || !messageKey || !newText) {
      return throwError(() => new Error('updateMessage: Ungültige Eingabe.'));
    }

    const messageRef = ref(
      this.database,
      `channels/${channelKey}/messages/${messageKey}`
    );

    const updateData = {
      message: newText,
      editedAt: serverTimestamp(),
    };

    return from(update(messageRef, updateData)).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[updateMessage] Fehler beim Aktualisieren der Nachricht ${messageKey}:`,
          error
        );
        return throwError(
          () => new Error('Fehler beim Aktualisieren der Nachricht.')
        );
      })
    );
  }

  toggleDirectMessageReaction(
    conversationId: string,
    messageKey: string,
    emoji: string,
    user: CustomUser
  ): Observable<void> {
    if (!conversationId || !messageKey || !emoji || !user || !user.uid) {
      return throwError(
        () => new Error('toggleDirectMessageReaction: Ungültige Eingabe.')
      );
    }

    const reactionsRef = ref(
      this.database,
      `direct-messages/${conversationId}/messages/${messageKey}/reactions`
    );

    return from(get(reactionsRef)).pipe(
      switchMap((snapshot) => {
        const currentReactionsVal = snapshot.val();
        let currentReactions: Reaction[] = [];
        if (Array.isArray(currentReactionsVal)) {
          currentReactions = currentReactionsVal;
        } else if (
          typeof currentReactionsVal === 'object' &&
          currentReactionsVal !== null
        ) {
          currentReactions = Object.values(currentReactionsVal);
        }

        let updatedReactions: Reaction[];
        const existingReactionIndex = currentReactions.findIndex(
          (r) => r.emoji === emoji && r.userId === user.uid
        );

        if (existingReactionIndex > -1) {
          updatedReactions = [
            ...currentReactions.slice(0, existingReactionIndex),
            ...currentReactions.slice(existingReactionIndex + 1),
          ];
        } else {
          const newReaction: Reaction = {
            emoji: emoji,
            userId: user.uid,
            userName: user.displayName || 'Unbekannt',
          };
          updatedReactions = [...currentReactions, newReaction];
        }
        const reactionsToSet =
          updatedReactions.length > 0 ? updatedReactions : null;
        return from(set(reactionsRef, reactionsToSet));
      }),
      map(() => void 0),
      catchError((error) => {
        console.error(
          `[toggleDirectMessageReaction] Fehler bei Reaktion für DM ${conversationId}, Msg ${messageKey}:`,
          error
        );
        return throwError(
          () => new Error('Fehler beim Aktualisieren der DM-Reaktion.')
        );
      })
    );
  }

  updateDirectMessage(
    conversationId: string,
    messageKey: string,
    newText: string
  ): Observable<void> {
    if (!conversationId || !messageKey) {
      console.error(
        '[FirebaseService] updateDirectMessage: Conversation ID oder Message Key fehlt.'
      );
      return throwError(
        () => new Error('Conversation ID or Message Key is missing')
      );
    }

    const messagePath = `direct-messages/${conversationId}/messages/${messageKey}`;
    const messageRef = ref(this.database, messagePath);

    const updates = {
      message: newText,
      editedAt: serverTimestamp(),
    };
    console.log(
      '[FirebaseService] updateDirectMessage - Updates-Objekt:',
      updates
    );

    return from(update(messageRef, updates)).pipe(
      catchError((error) => {
        console.error(
          `[FirebaseService] updateDirectMessage - Fehler beim Aktualisieren in Firebase SDK (Pfad: ${messagePath}):`, // Pfad im Log hinzugefügt
          error
        );
        return throwError(
          () =>
            new Error(
              'Failed to update direct message. Original error: ' +
                error.message
            )
        );
      })
    );
  }

  updateThreadMessage(
    threadKey: string,
    messageKey: string,
    newText: string
  ): Observable<void> {
    if (!threadKey || !messageKey || typeof newText !== 'string') {
      const errorMsg =
        '[FirebaseService] updateThreadMessage: Ungültige Parameter.';
      console.error(errorMsg, { threadKey, messageKey, newText });
      return throwError(() => new Error(errorMsg));
    }

    const messagePath = `Threads/${threadKey}/threadMsg/${messageKey}`;
    const messageRef = ref(this.database, messagePath);

    const updates = {
      message: newText,
      editedAt: serverTimestamp(),
    };

    return from(update(messageRef, updates)).pipe(
      tap(() =>
        console.log(
          `[FirebaseService] Nachricht ${messageKey} in Thread ${threadKey} unter Pfad ${messagePath} erfolgreich aktualisiert.`
        )
      ),
      catchError((error) => {
        console.error(
          `[FirebaseService] Fehler beim Aktualisieren der Nachricht ${messageKey} in Thread ${threadKey} unter Pfad ${messagePath}:`,
          error
        );
        return throwError(
          () =>
            new Error(
              'Fehler beim Aktualisieren der Thread-Nachricht: ' + error.message
            )
        );
      })
    );
  }

  async getChannelNames(): Promise<void> {
    const dbRef = ref(this.database, 'channels');
    this.channelListDatabase = []; // Leeren Sie die Liste, bevor Sie neue Daten abrufen

    try {
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          const channel = data[key];

          this.channelListDatabase.push(channel.channelName);
        });
      } else {
        console.log('Keine Channels gefunden.');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Channels:', error);
    }
  }

  getAllChannelsWithNameAndKey(): Observable<ChannelNameAndKey[]> {
    const channelsRef = ref(this.database, 'channels');
    // Annahme: Channel-Interface hat channelName und listVal fügt 'key' hinzu
    return listVal<Channel & { key: string }>(channelsRef, {
      keyField: 'key',
    }).pipe(
      map((channels) => {
        if (!channels) return [];
        return channels.map((channel) => ({
          key: channel.key,
          channelName: channel.channelName,
        }));
      }),
      catchError((error) => {
        console.error(
          '[getAllChannelsWithNameAndKey] Fehler beim Abrufen aller Channels:',
          error
        );
        return of([]);
      })
    );
  }

  async getAllDirectMessageKeys() {
  const messagesRef = ref(this.database, 'direct-messages');
  
  try {
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      return snapshot.val(); // Gibt das Objekt mit allen Nachrichten zurück
    } else {
      return null; // Es gibt keine Daten an diesem Pfad
    }
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    return null;
  }
}
}
