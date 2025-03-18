import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VariablesService {

  constructor() { }

  private isClosedSubject = new BehaviorSubject<boolean>(false);
  threadIsClosed$ = this.isClosedSubject.asObservable();


  toggleThread(){
    this.isClosedSubject.next(!this.isClosedSubject.value);
  }


}
