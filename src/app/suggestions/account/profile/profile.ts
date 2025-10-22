import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; 
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/account-state';
import { Firestore, doc, getDoc, collection, query, where, getDocs, QuerySnapshot, DocumentData } from '@angular/fire/firestore';

// 🔥 Declaration for TypeScript to recognize the global environment variable
declare const __app_id: string; 

interface UserProfileData {
  prn: string; 
  internal_email: string;
  random_id: string; // The ID we need for public queries
  // Add other fields you might store in the main profile document
}

interface UserSuggestion {
  post_id: string;
  title: string;
  summary: string;
  created_at: string;
  upvotes: number;
  comment_count: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html', // This template is required for the visual layout
  // Assuming styles are in './profile.css' or similar, but keeping original structure
  styleUrls: ['./profile.scss'] 
})
export class Profile implements OnInit, OnDestroy {
  private authService: AuthService = inject(AuthService); 
  private firestore: Firestore = inject(Firestore);
  private router = inject(Router);
  private authSubscription!: Subscription;

  // State Signals
  isLoading = signal(true);
  isLoggedIn = signal(false);
  isBanned = signal(false);
  // FIX: Renamed from userId to firebaseUid to reflect the value received from AuthService
  firebaseUid = signal<string | null>(null); 
  
  // Data Signals
  profileData = signal<UserProfileData | null>(null);
  userSuggestions = signal<UserSuggestion[]>([]);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Subscribe to Auth state changes
    this.authSubscription = this.authService.userState$.subscribe(state => {
      this.isLoggedIn.set(state.isLoggedIn);
      this.isBanned.set(state.isBanned);
      // FIX: Use the new firebaseUid property from the state
      this.firebaseUid.set(state.firebaseUid); 
      
      this.isLoading.set(true);
      
      if (!state.isLoggedIn) {
        // FIX: Redirect to the correct absolute login path
        this.router.navigate(['/suggestions/account/login']);
      } 
      // FIX: Use the correct property to check for the ID before fetching
      else if (state.firebaseUid) { 
        // Fetch data using the Firebase UID
        this.fetchUserProfileData(state.firebaseUid);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private getAppId(): string {
    return typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }

  // Parameter 'uid' now correctly refers to the Firebase UID
  async fetchUserProfileData(uid: string) {
    this.errorMessage.set(null);
    let randomId: string | undefined;

    try {
      // 1. Fetch Private Profile Data to get the random_id
      const appId = this.getAppId();
      // Document lookup path correctly uses the Firebase UID
      const profileDocRef = doc(this.firestore, `artifacts/${appId}/users/${uid}`); 
      const profileSnap = await getDoc(profileDocRef);
      
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfileData;
        this.profileData.set(data);
        randomId = data.random_id;
      } else {
        // This indicates the user is authenticated but the profile document is missing.
        this.errorMessage.set('Profile document not found.');
      }

      // Check if we have the random ID before proceeding to public data fetch
      if (!randomId) {
        this.errorMessage.set(this.errorMessage() || 'Could not retrieve user\'s public identifier (random ID).');
        this.userSuggestions.set([]);
        return; // Exit early if we can't get the ID
      }


      // 2. 🔥 Fetch User's Public Suggestions (Posts) using the randomId
      const suggestionsCollectionRef = collection(
        this.firestore,
        `artifacts/${appId}/public/data/suggestions`
      );
      
      // Query to find all suggestions where the user_id matches the user's random_id
      const q = query(suggestionsCollectionRef, where('user_id', '==', randomId));
      const querySnapshot = await getDocs(q);
      
      const suggestions: UserSuggestion[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserSuggestion;
        suggestions.push({
          post_id: doc.id,
          title: data.title,
          summary: data.summary,
          created_at: data.created_at,
          upvotes: data.upvotes || 0,
          comment_count: data.comment_count || 0,
        });
      });
      this.userSuggestions.set(suggestions);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      this.errorMessage.set('Failed to load user data. Check console for details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
