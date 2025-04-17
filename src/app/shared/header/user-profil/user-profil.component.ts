import { Component, EventEmitter, Inject, inject, Optional, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { User } from '../../interfaces/user';
import { SharedModule } from '../../../shared';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-user-profil',
  standalone: true,
  imports: [],
  templateUrl: './user-profil.component.html',
  styleUrl: './user-profil.component.scss'
})
export class UserProfilComponent {

  userData: any = {};

  private authService: AuthService = inject(AuthService);


  constructor(@Optional() public dialogRef: MatDialogRef<UserProfilComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { data: User }
  ) {
    if (data) {
      this.userData = data.data;
    }



    // this.userData = this.data.data;
  }

  closeDialog() {
    this.dialogRef.close(UserProfilComponent);
  }

  selectUserForDm(user: User): void {
    console.log('[Dialog] User selected:', user);
    if (this.dialogRef) {
      this.dialogRef.close(user); // gibt User zurück an HeaderComponent
    }
  }
  

}
