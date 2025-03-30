import { Component, input, Input } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  @Input() user!: { displayName: string; avatar: string };


  constructor(public dialog: MatDialog) {
    
  }

  ngOnInit(){
    this.toJSON();
  }

  toJSON(){
    JSON.stringify(this.user);
  }

  openDialog() {
    this.dialog.open(DialogComponent, {
      data: this.user});
  }
}

