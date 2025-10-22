import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Auth, user, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from '@angular/fire/auth'; 
import { BehaviorSubject, Observable } from 'rxjs'; 
import { switchMap } from 'rxjs/operators'; // Added switchMap for completeness

// 🔥 Declaration for TypeScript to recognize the global environment variable
declare const __app_id: string; 

// --- INTERFACES ---
interface UserProfile {
  isBanned: boolean;
  prn: string; 
  internal_email: string;
  random_id: string; // Public ID used for suggestions query
}

export interface UserState {
  isLoggedIn: boolean;
  firebaseUid: string | null; // <-- FIX: The actual Firebase Auth UID
  randomId: string | null;    // <-- FIX: The public identifier from Firestore profile
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
    firebaseUid: null, // Changed from accountId
    randomId: null,    // Added new field
    isBanned: false,
    prn: null,
  });
  
  public userState$: Observable<UserState> = this.userStateSubject.asObservable();

  // 🔥 Domain used to construct the internal email (MUST be consistent)
  private readonly AUTH_DOMAIN = '@yourinstitutiondomain.com'; 

  constructor() {
    // 1. Set up the observable listener for real-time Firebase Auth state changes
    user(this.auth).subscribe(async firebaseUser => {
      // Use the dedicated state checker logic when the Firebase user object changes
      await this.checkAuthStateAndSetProfile(firebaseUser);
    });
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
  private async checkAuthStateAndSetProfile(firebaseUser: any | null): Promise<void> {
    console.log('--- checkAuthStateAndSetProfile RUNNING ---');

    if (firebaseUser) {
      const uid = firebaseUser.uid;
      // Manually fetch the profile data using getDoc
      const profile = await this.getUserProfile(uid);

      if (profile) {
        // Update state with data from Auth and Firestore profile
        this.userStateSubject.next({
          isLoggedIn: true,
          firebaseUid: uid, // Correctly set the Firebase UID
          randomId: profile.random_id, // Correctly set the public ID
          isBanned: profile.isBanned,
          prn: profile.prn,
        });
        console.log('State updated: Logged In', { uid, prn: profile.prn });

        // Handle routing based on ban status (adjust paths as needed for your application)
        // NOTE: Absolute paths are usually better for navigation guards
        if (profile.isBanned && !this.router.url.includes('/banned')) {
          this.router.navigate(['/banned']);
        } 
        
      } else {
        // This handles the "Profile document not found" scenario
        console.error('CRITICAL: User authenticated but profile data is missing or inaccessible. Forcing logout.');
        this.userStateSubject.next({ isLoggedIn: false, firebaseUid: null, randomId: null, isBanned: false, prn: null });
        await signOut(this.auth);
      }
    } else {
      // User is logged out
      this.userStateSubject.next({ isLoggedIn: false, firebaseUid: null, randomId: null, isBanned: false, prn: null });
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

      // 2. 🔥 CRITICAL FIX: Create the initial user profile in Firestore
      await this.createProfile(uid, prn, internalEmail, randomid);
      
      // 3. The user subscription above will automatically trigger checkAuthStateAndSetProfile,
      //    setting the final state for the application.

    } catch (error) {
      console.error('Registration failed:', error);
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

      // The user subscription above will automatically handle state updates.

    } catch (error) {
      console.error('PRN/Password login failed:', error);
      throw new Error("Invalid Student ID or Password. Please try again."); 
    }
  }

  public async logout(): Promise<void> {
    await signOut(this.auth);
    // The user subscription above will automatically handle state updates.
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
        console.warn(`Profile document missing for UID: ${uid}. Path: ${userDocRef.path}`);
        return undefined;
      }
    } catch (error) {
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
