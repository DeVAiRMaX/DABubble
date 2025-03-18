import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VariablesService {

  constructor() { }

  private isClosedSubject = new BehaviorSubject<boolean>(false);
  threadIsClosed$ = this.isClosedSubject.asObservable();


  private sideNavIsVisibleSubject = new BehaviorSubject<boolean>(true);
  sideNavIsVisible$ = this.sideNavIsVisibleSubject.asObservable();

  toggleSideNav(){
    this.sideNavIsVisibleSubject.next(!this.sideNavIsVisibleSubject.value);
  }


  toggleThread(){
    this.isClosedSubject.next(!this.isClosedSubject.value);
  }


}
