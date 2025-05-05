import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { User } from './shared/interfaces/user';
import { ChannelWithKey } from './shared/interfaces/channel';

@Injectable({
  providedIn: 'root',
})
export class VariablesService {
  constructor() {
    this.loadState();
  }

  private activeDmUserSubject = new BehaviorSubject<User | null>(null);
  activeDmUser$ = this.activeDmUserSubject.asObservable();

  private activeChannelSubject = new BehaviorSubject<ChannelWithKey | null>(
    null
  );
  activeChannel$ = this.activeChannelSubject.asObservable();

  setActiveDmUser(user: User | null): void {
    if (user) {
      this.setActiveChannel(null);
      this.closeThread();
    }
    this.activeDmUserSubject.next(user);
  }

  getActiveDmUser(): User | null {
    return this.activeDmUserSubject.getValue();
  }

  setActiveChannel(channel: ChannelWithKey | null): void {
    if (channel) {
      this.setActiveDmUser(null);
      this.closeThread();
    }
    this.activeChannelSubject.next(channel);
  }

  getActiveChannel(): ChannelWithKey | null {
    return this.activeChannelSubject.getValue();
  }

  private isClosedSubject = new BehaviorSubject<boolean>(
    this.getStoredValue('isClosed', false)
  );
  threadIsClosed$ = this.isClosedSubject.asObservable();

  private addUserToChannelOverlayIsVisibleSubject =
    new BehaviorSubject<boolean>(false);
  addUserToChannelOverlayIsVisible$ =
    this.addUserToChannelOverlayIsVisibleSubject.asObservable();

  private sideNavIsVisibleSubject = new BehaviorSubject<boolean>(
    this.getStoredValue('sideNavIsVisible', true)
  );
  sideNavIsVisible$ = this.sideNavIsVisibleSubject.asObservable();

  private addChannelOverlayIsVisibleSubject = new BehaviorSubject<boolean>(
    false
  );
  addChannelOverlayIsVisible$ =
    this.addChannelOverlayIsVisibleSubject.asObservable();

  private channelCreatedSource = new Subject<void>();
  channelCreated$ = this.channelCreatedSource.asObservable();

  private threadOpenSubject = new BehaviorSubject<boolean>(false);
  threadIsOpen$ = this.threadOpenSubject.asObservable();

  private activeThreadKeySubject = new BehaviorSubject<string | null>(null);
  activeThreadKey$ = this.activeThreadKeySubject.asObservable();

  toggleAddUserToChannelOverlay() {
    const newValue = !this.addUserToChannelOverlayIsVisibleSubject.value;
    this.addUserToChannelOverlayIsVisibleSubject.next(newValue);
  }

  toggleAddChannelOverlay() {
    const newValue = !this.addChannelOverlayIsVisibleSubject.value;
    this.addChannelOverlayIsVisibleSubject.next(newValue);
  }

  toggleSideNav() {
    const newValue = !this.sideNavIsVisibleSubject.value;
    this.sideNavIsVisibleSubject.next(newValue);
    this.saveToStorage('sideNavIsVisible', newValue);
  }

  toggleThread() {
    const newValue = !this.isClosedSubject.value;
    this.isClosedSubject.next(newValue);
    this.saveToStorage('isClosed', newValue);
  }

  notifyChannelCreated(): void {
    this.channelCreatedSource.next();
  }

  private saveToStorage(key: string, value: boolean) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private getStoredValue(key: string, defaultValue: boolean): boolean {
    const storedValue = localStorage.getItem(key);
    return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
  }

  private loadState() {
    this.isClosedSubject.next(this.getStoredValue('isClosed', false));
    this.sideNavIsVisibleSubject.next(
      this.getStoredValue('sideNavIsVisible', true)
    );
  }

  private nameToFilterSubject = new BehaviorSubject<string>('');
  nameToFilter$ = this.nameToFilterSubject.asObservable();

  setNameToFilter(newName: string) {
    this.nameToFilterSubject.next(newName);
  }

  getNameToFilter() {
    return this.nameToFilterSubject.value;
  }

  private taggedContactsFromChatSubject = new BehaviorSubject<
    { name: string; img: string }[]
  >([]);
  taggedContactsInCha$ = this.taggedContactsFromChatSubject.asObservable();

  setTaggedContactsFromChat(contacts: { name: string; img: string }[]) {
    this.taggedContactsFromChatSubject.next(contacts);
  }

  getTaggedContactsFromChat() {
    return this.taggedContactsFromChatSubject.getValue();
  }

  private taggedContactsFromThreadSubject = new BehaviorSubject<
    { name: string; img: string }[]
  >([]);
  taggedContactsInThread$ = this.taggedContactsFromThreadSubject.asObservable();

  setTaggedContactsFromThread(contacts: { name: string; img: string }[]) {
    this.taggedContactsFromThreadSubject.next(contacts);
  }

  getTaggedcontactsFromThreads() {
    return this.taggedContactsFromThreadSubject.getValue();
  }

  openThread(threadKey: string) {
    this.activeThreadKeySubject.next(threadKey);
    this.threadOpenSubject.next(true);
    this.setActiveChannel(null);
    this.setActiveDmUser(null);
  }

  closeThread() {
    this.threadOpenSubject.next(false);
    this.activeThreadKeySubject.next(null);
  }

  toggleThreadVisibility() {
    const willBeOpen = !this.threadOpenSubject.value;
    this.threadOpenSubject.next(willBeOpen);
    if (!willBeOpen) {
      this.activeThreadKeySubject.next(null);
    } else {
      this.setActiveChannel(null);
      this.setActiveDmUser(null);
    }
  }
}
