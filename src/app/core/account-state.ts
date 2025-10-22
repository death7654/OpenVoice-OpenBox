import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
// Removed unused imports: docData, Observable, from, switchMap, first, lastValueFrom, of
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Auth, user, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from '@angular/fire/auth'; 
// Retained BehaviorSubject, but the public type is now just the interface
import { BehaviorSubject, Observable } from 'rxjs'; 

// 🔥 Declaration for TypeScript to recognize the global environment variable
declare const __app_id: string; 

// --- INTERFACES ---
interface UserProfile {
  isBanned: boolean;
  prn: string; 
  internal_email: string;
  random_id: string;
}

export interface UserState {
  isLoggedIn: boolean;
  accountId: string | null;
  isBanned: boolean;
  prn: string | null; 
}
// --------------------

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private auth = inject(Auth); 

  private userStateSubject = new BehaviorSubject<UserState>({
    isLoggedIn: false,
    accountId: null,
    isBanned: false,
    prn: null,
  });
  // The public state remains an Observable for components to subscribe to, 
  // but its updates are now driven imperatively.
  public userState$: Observable<UserState> = this.userStateSubject.asObservable();

  // 🔥 Domain used to construct the internal email (MUST be consistent)
  private readonly AUTH_DOMAIN = '@yourinstitutiondomain.com'; 

  constructor() {
    // 1. On service initialization, manually check the current state
    this.checkAuthStateAndSetProfile();
  }
  
  // Helper to safely retrieve the App ID for Firestore paths
  private getAppId(): string {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return appId;
  }

  /**
   * CORE IMPERATIVE LOGIC: Checks the Firebase auth state, fetches profile data, 
   * and updates the BehaviorSubject.
   */
  private async checkAuthStateAndSetProfile(): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    console.log('--- checkAuthStateAndSetProfile RUNNING ---');

    if (firebaseUser) {
      // Manually fetch the profile data using getDoc
      const profile = await this.getUserProfile(firebaseUser.uid);
      const uid = firebaseUser.uid;

      if (profile) {
        // Update state with data from Auth and Firestore profile
        this.userStateSubject.next({
          isLoggedIn: true,
          accountId: profile.random_id,
          isBanned: profile.isBanned,
          prn: profile.prn,
        });
        console.log('State updated: Logged In', { uid, prn: profile.prn });

        // Handle routing based on ban status
        if (profile.isBanned && this.router.url !== '/banned') {
          this.router.navigate(['/banned']);
        } else if (!profile.isBanned && (this.router.url === '/login' || this.router.url === '/')) {
          this.router.navigate(['/dashboard']);
        }

      } else {
        console.error('CRITICAL: User authenticated but profile data is missing or inaccessible. Forcing logout.');
        this.userStateSubject.next({ isLoggedIn: false, accountId: null, isBanned: false, prn: null });
        await signOut(this.auth);
      }
    } else {
      // User is logged out
      this.userStateSubject.next({ isLoggedIn: false, accountId: null, isBanned: false, prn: null });
      
      // Redirect if currently on a protected route
      if (this.router.url !== '/login' && this.router.url !== '/register' && this.router.url !== '/') {
         this.router.navigate(['/login']);
      }
      console.log('State updated: Logged Out');
    }
  }

  /**
   * Creates a new user with PRN and Password.
   */
  public async registerWithPrnAndPassword(prn: string, password: string, randomid: string): Promise<void> {
    try {
      const internalEmail = `${prn}${this.AUTH_DOMAIN}`; 
      
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, internalEmail, password);
      const uid = userCredential.user.uid;

      // 2. Create the initial user profile in Firestore
      await this.createProfile(uid, prn, internalEmail, randomid);
      
      // 3. Manually check the state to set the profile data
      await this.checkAuthStateAndSetProfile();

    } catch (error) {
      console.error('Registration failed:', error);
      // Rethrow to allow the component to display user-friendly errors
      throw error; 
    }
  }


  /**
   * Handles custom PRN/Password login.
   */
  public async signInWithPrnAndPassword(prn: string, password: string): Promise<void> {
    try {
      const internalEmail = `${prn}${this.AUTH_DOMAIN}`; 
      
      await signInWithEmailAndPassword(this.auth, internalEmail, password);

      // After successful sign-in, manually check the state to set the profile data
      await this.checkAuthStateAndSetProfile();

    } catch (error) {
      console.error('PRN/Password login failed:', error);
      throw new Error("Invalid Student ID or Password. Please try again."); 
    }
  }

  public async logout(): Promise<void> {
    await signOut(this.auth);
    // After sign-out, manually check state to clear the profile data
    this.checkAuthStateAndSetProfile();
  }

  /**
   * Retrieves the user profile document using a one-time fetch (getDoc).
   */
  private async getUserProfile(uid: string): Promise<UserProfile | undefined> {
    const appId = this.getAppId();
    // Path: artifacts/{appId}/users/{uid}
    const userDocRef = doc(this.firestore, `artifacts/${appId}/users/${uid}`);
    
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        return profile;
      } else {
        // Document does not exist (This is where the null came from before)
        console.warn(`Profile document missing for UID: ${uid}. Path: ${userDocRef.path}`);
        return undefined;
      }
    } catch (error) {
      // Error during manual profile fetch (usually permission denied)
      console.error("Error fetching profile via getDoc:", error);
      return undefined;
    }
  }

  /**
   * Creates the initial user profile document in Firestore.
   */
  private createProfile(uid: string, prn: string, internalEmail: string, randomid: string): Promise<void> {
    const appId = this.getAppId();
    // Path: artifacts/${appId}/users/${uid}
    const userDocRef = doc(this.firestore, `artifacts/${appId}/users/${uid}`);
    
    const initialData: UserProfile = { 
        isBanned: false, 
        prn: prn,
        internal_email: internalEmail,
        random_id: randomid,
    };

    return setDoc(userDocRef, initialData)
      .then(() => console.log('Profile created successfully at:', userDocRef.path))
      .catch(error => {
        console.error('CRITICAL: Error creating profile for:', uid, error);
        throw error;
      });
  }
}