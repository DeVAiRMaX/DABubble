import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VariablesService {
  constructor() {
    this.loadState();
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
}
