import { HostListener, Injectable, signal } from '@angular/core';
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

  googleLogin: boolean = false;

  private isMobileSubject = new BehaviorSubject<boolean>(
    window.innerWidth <= 940
  );
  isMobile$ = this.isMobileSubject.asObservable();

  public checkWindowSize(): void {
    const isMobile = window.innerWidth <= 940;
    if (this.isMobileSubject.value !== isMobile) {
      this.isMobileSubject.next(isMobile);

      if (isMobile) {
        this.hideChannelChatView();
        this.hidesDmChatView();
        this.showSideNav();
      }
    }
  }


  private initialAnimationPlayed = false; 

  get InitialAnimationPlayed(): boolean {
    return this.initialAnimationPlayed;
  }

  set InitialAnimationPlayed(value: boolean) {
    this.initialAnimationPlayed = value;
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
      this.isEmptyMessageSubject.next(false);
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
      this.isEmptyMessageSubject.next(false);
    }
    this.activeChannelSubject.next(channel);
  }

  getActiveChannel(): ChannelWithKey | null {
    return this.activeChannelSubject.getValue();
  }

  setEmptyMessageTrue() {
    this.activeChannelSubject.next(null);
    this.activeDmUserSubject.next(null);
    this.closeThread();
    this.isEmptyMessageSubject.next(true);
  }

  private isEmptyMessageSubject = new BehaviorSubject<boolean>(false);
  isEmptyMessage$ = this.isEmptyMessageSubject.asObservable();

  private  isAboutToLoginSubject = new BehaviorSubject<boolean>(false);
  isAboutToLogin$ = this.isAboutToLoginSubject.asObservable();

  async setLoginStatusToTrue(){
    this.isAboutToLoginSubject.next(true);
    setTimeout(() => {
      this.isAboutToLoginSubject.next(false);
    }, 800);
  }

  private userIsAGuestSubject = new BehaviorSubject<boolean>(false);
  userIsAGuest$ = this.userIsAGuestSubject.asObservable();

  setUserIsAGuest(isGuest: boolean) {
    this.userIsAGuestSubject.next(isGuest);
  };

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

  private userLeavedChannelSource = new Subject<void>();
  userLeavedChannel$ = this.userLeavedChannelSource.asObservable();

  private memberRemovedFromChannel = new Subject<void>();
  memberRemovedFromChannel$ = this.userLeavedChannelSource.asObservable();

  private memberAddedToChannel = new Subject<void>();
  memberAddedToChannel$ = this.memberAddedToChannel.asObservable();

  private threadOpenSubject = new BehaviorSubject<boolean>(false);
  threadIsOpen$ = this.threadOpenSubject.asObservable();

  private activeThreadKeySubject = new BehaviorSubject<string | null>(null);
  activeThreadKey$ = this.activeThreadKeySubject.asObservable();

  public channelChatView = signal<boolean>(false);
  public readonly chatIsVisible = this.channelChatView.asReadonly();

  toggleChannelChatView(): void {
    this.channelChatView.update((currentValue) => !currentValue);
  }

  public showChannelChatView(): void {
    this.channelChatView.set(true);
  }

  public hideChannelChatView(): void {
    this.channelChatView.set(false);
  }

  public showDmChatView = signal<boolean>(false);
  public readonly dmIsVisible = this.showDmChatView.asReadonly();

  togglesDmChatView(): void {
    this.showDmChatView.update((currentValue) => !currentValue);
  }

  public showsDmChatView(): void {
    this.showDmChatView.set(true);
  }

  public hidesDmChatView(): void {
    this.showDmChatView.set(false);
  }

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

  public showSideNav(): void {
    if (this.sideNavIsVisibleSubject.value !== true) {
      this.sideNavIsVisibleSubject.next(true);
      this.saveToStorage('sideNavIsVisible', true);
    }
  }

  public hideSideNav(): void {
    if (this.sideNavIsVisibleSubject.value !== false) {
      this.sideNavIsVisibleSubject.next(false);
      this.saveToStorage('sideNavIsVisible', false);
    }
  }

  toggleThread() {
    const newValue = !this.isClosedSubject.value;
    this.isClosedSubject.next(newValue);
    this.saveToStorage('isClosed', newValue);
  }

  toggleLoginStatus() {
    this.googleLogin = !this.googleLogin;
  }

  notifyChannelCreated(): void {
    this.channelCreatedSource.next();
  }

  notifyUserLeavedChannel() {
    this.userLeavedChannelSource.next();
  }

  notifyMemberRemovedFromChannel() {
    this.memberRemovedFromChannel.next();
  }

  notifyMemberAddedToChannel() {
    this.memberAddedToChannel.next();
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
      this.setActiveDmUser(null);
    }
  }
}
