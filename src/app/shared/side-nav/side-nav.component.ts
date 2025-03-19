import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared';
import { VariablesService } from '../../variables.service';
import { CommonModule } from '@angular/common';
import { ChannelCreateOverlayComponent } from '../channel-create-overlay/channel-create-overlay.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [SharedModule, CommonModule, ChannelCreateOverlayComponent],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit {
  isChannelListExpanded: boolean = true;
  isMsgListExpanded: boolean = true;
 sideNavIsVisible:boolean = true;
 addChannelOverlayIsVisible$:Observable<boolean>;
  ngOnInit() {
    // Lade gespeicherte Zustände aus dem LocalStorage
    const savedChannelState = localStorage.getItem('channelListExpanded');
    const savedMsgState = localStorage.getItem('msgListExpanded');
    
    this.isChannelListExpanded = savedChannelState ? JSON.parse(savedChannelState) : true;
    this.isMsgListExpanded = savedMsgState ? JSON.parse(savedMsgState) : true;
  }

 
  constructor(private variableService: VariablesService){

    this.addChannelOverlayIsVisible$ = this.variableService.addChannelOverlayIsVisible$;

    this.variableService.sideNavIsVisible$.subscribe(value =>{
      this.sideNavIsVisible = value;
    })
  }

  toggleChannelNav(){
    this.variableService.toggleSideNav();
  }

  toggleChannelList() {
    this.isChannelListExpanded = !this.isChannelListExpanded;
    // Speichere neuen Zustand im LocalStorage
    localStorage.setItem('channelListExpanded', JSON.stringify(this.isChannelListExpanded));
  }

  toggleMsgList() {
    this.isMsgListExpanded = !this.isMsgListExpanded;
    // Speichere neuen Zustand im LocalStorage
    localStorage.setItem('msgListExpanded', JSON.stringify(this.isMsgListExpanded));
  }

  showAddChannelOverlay(){
    this.variableService.toggleAddChannelOverlay();
  }
}
