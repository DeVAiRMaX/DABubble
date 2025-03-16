import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent implements OnInit {
  isChannelListExpanded: boolean = true;
  isMsgListExpanded: boolean = true;

  ngOnInit() {
    // Lade gespeicherte Zustände aus dem LocalStorage
    const savedChannelState = localStorage.getItem('channelListExpanded');
    const savedMsgState = localStorage.getItem('msgListExpanded');
    
    this.isChannelListExpanded = savedChannelState ? JSON.parse(savedChannelState) : true;
    this.isMsgListExpanded = savedMsgState ? JSON.parse(savedMsgState) : true;
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
}
