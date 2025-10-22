import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, catchError, of, switchMap } from 'rxjs';

interface UserProfile {
  isBanned: boolean;
}

export interface UserState {
  isLoggedIn: boolean;
  accountId: string | null;
  isBanned: boolean;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private firestore = inject(Firestore);
  private router = inject(Router);

  private userStateSubject = new BehaviorSubject<UserState>({
    isLoggedIn: false,
    accountId: null,
    isBanned: false,
  });

  public userState$: Observable<UserState> = this.userStateSubject.asObservable();

  constructor() {
  }

  /**
   * * @param anonymousUid 
   */
  public loginWithAnonymousUid(anonymousUid: string): void {
    this.userStateSubject.next({
      isLoggedIn: true,
      accountId: anonymousUid,
      isBanned: false,
    });

    this.getUserProfile(anonymousUid)
      .pipe(
        catchError(error => {
          console.error('Error loading user profile. Logging out.', error);
          this.logout();
          return of(undefined); 
        })
      )
      .subscribe(profile => {
        if (profile) {
          this.userStateSubject.next({
            isLoggedIn: true,
            accountId: anonymousUid,
            isBanned: profile.isBanned,
          });

          if (profile.isBanned) {
            this.router.navigate(['/banned']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } 
      });
  }

  private getUserProfile(uid: string): Observable<UserProfile | undefined> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    
    return docData(userDocRef) as Observable<UserProfile | undefined>;
  }

  private createProfile(uid: string): void {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    const initialData: UserProfile = { isBanned: false };

    setDoc(userDocRef, initialData)
      .then(() => {
        console.log('Default profile created for new user:', uid);
      })
      .catch(error => console.error('Error creating profile:', error));
  }
  

  public logout(): void {
    this.userStateSubject.next({ isLoggedIn: false, accountId: null, isBanned: false });
    this.router.navigate(['/login']);
  }
}