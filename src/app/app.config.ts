import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideAnimations(), provideAnimationsAsync(), provideFirebaseApp(() => initializeApp({"projectId":"da-bubble-13032025","appId":"1:179510872221:web:c0572d65241ab236162c74","databaseURL":"https://da-bubble-13032025-default-rtdb.europe-west1.firebasedatabase.app","storageBucket":"da-bubble-13032025.firebasestorage.app","apiKey":"AIzaSyCDv1-TzUTJR9WMj_8GlvQC5iG3tE4tJbA","authDomain":"da-bubble-13032025.firebaseapp.com","messagingSenderId":"179510872221"})), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideDatabase(() => getDatabase())]
};
