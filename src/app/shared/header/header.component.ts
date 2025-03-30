import { Component, Input } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
// import { userData } from '../interfaces/user';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  // userData: userData | null = null;

  user: any = [];


  constructor(public dialog: MatDialog) {
    this.toJSON();
    console.log(this.user);
    
  }

  toJSON(){
    JSON.stringify(this.user);
  }

  openDialog() {
    this.dialog.open(DialogComponent);
  }
}

