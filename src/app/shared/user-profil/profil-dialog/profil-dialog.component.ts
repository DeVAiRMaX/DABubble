import { Component, Inject, inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { User } from '../../interfaces/user';
import { Observable } from 'rxjs';
import { SharedModule } from '../../../shared';
import { EditProfilDialogComponent } from './edit-profil-dialog/edit-profil-dialog.component';

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './profil-dialog.component.html',
  styleUrl: './profil-dialog.component.scss',
  animations: [
    trigger('profilDialogAnimation', [
      state('open', style({
        transform: 'translateX(0)',
        height: 'auto',
        opacity: 1
      })),
      state('close', style({
        transform: 'translateX(100%)',
        height: '0',
        opacity: 0
      })),
      transition('close => open', [
        style({ transform: 'translateX(100%)', height: '0', opacity: 0 }),
        animate('0.25s ease-out')
      ]),
      transition('open => close', [
        animate('0.15s ease-out',
          style({ transform: 'translateX(100%)', height: '0', opacity: 0 })
        )
      ])
    ])
  ]
})
export class ProfilDialogComponent {

  private authService: AuthService = inject(AuthService);

  profilDialogAnimation: 'open' | 'close' = 'close';
  user$: Observable<User | null>;

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<ProfilDialogComponent>) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
  }

  startAnimation() {
    this.profilDialogAnimation = 'open';
  }

  closeDialog() {
    this.profilDialogAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close(ProfilDialogComponent);
    }, 100);
  }

  openEditProfilDialog() {
      this.dialog.open(EditProfilDialogComponent, {});
  }
}
