import { Component, OnInit, Inject, PLATFORM_ID, Input, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { AuthService, UserState } from '../../core/account-state'; 
import { Subscription, Observable, combineLatest, of } from 'rxjs'; 
import { inject } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { map, switchMap, tap } from 'rxjs/operators';

// 🔥 DIRECT FIREBASE/FIRESTORE IMPORTS
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore'; 

// 🔥 Domain for Firestore
declare const __app_id: string; 

// --- INTERFACES ---
interface Comment {
  user_id: string; // This is the user's randomId (public identifier)
  text: string;
  timestamp: string;
}

export interface Suggestion {
  id: string; // Document ID for Firestore
  user_id: string;
  title: string;
  description: string;
  summary: string;
  tags: string[];
  solved: boolean;
  category: string;
  upvotes: number;
  downvotes: number;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
  resolved_at: string | null;
  comments: Comment[];
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}
// --------------------


@Component({
  selector: 'app-all-suggestions',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe, MarkdownModule],
  templateUrl: './all-suggestions.html',
})
export class AllSuggestions implements OnInit, OnDestroy { 
  suggestions: Suggestion[] = [];
  filteredSuggestions: Suggestion[] = [];
  searchQuery = '';
  selectedTag = 'All';
  selectedCategory = 'All';
  sortOrder: 'votes' | 'newest' | 'oldest' | 'solved' | 'unsolved' = 'votes';
  userUpvotes: string[] = [];
  userDownvotes: string[] = [];
  newComment = '';

  isLoggedIn = false; 
  isBanned = false; 
  private authSubscription!: Subscription; 
  private suggestionsSubscription!: Subscription; // To hold the Firestore subscription
  
  private authService = inject(AuthService); 
  // 🔥 DIRECTLY INJECT FIREBASE
  private firestore = inject(Firestore);
  
  private appId: string;

  private lastSearchQuery = '';
  private lastSelectedTag = 'All';
  private lastSelectedCategory = 'All';
  private lastSortOrder: 'votes' | 'newest' | 'oldest' | 'solved' | 'unsolved' = 'votes';

  selectedSuggestion: Suggestion | null = null;
  private suggestionModal: Modal | null = null;

  user_id: string | null = null; // The public randomId

  private readonly UPVOTES_KEY = 'userUpvotes';
  private readonly DOWNVOTES_KEY = 'userDownvotes';

  isBrowser = false;

  allCategories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other',
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Safely retrieve the App ID
    this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      // 1. Subscribe to Auth state
      this.authSubscription = this.authService.userState$.subscribe((state: UserState) => {
        this.isLoggedIn = state.isLoggedIn;
        this.isBanned = state.isBanned; 
        this.user_id = state.randomId; 
      });
      
      // 2. Load votes from Local Storage (Needs migration to Firestore)
      this.loadUserVotes(); 
      
      // 3. Subscribe to Suggestions from Firestore
      this.loadSuggestionsFromFirestore();
    }
  }
  
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.suggestionsSubscription) {
      this.suggestionsSubscription.unsubscribe();
    }
  }

  // --- FIREBASE/FIRESTORE FUNCTIONS (Integrated) ---

  /**
   * Subscribes to the Firestore collection and updates the local suggestions array.
   */
  private loadSuggestionsFromFirestore(): void {
    const path = `artifacts/${this.appId}/suggestions`;
    const suggestionsCollection = collection(this.firestore, path);
    
    this.suggestionsSubscription = (collectionData(suggestionsCollection, { idField: 'id' }) as Observable<Suggestion[]>)
      .pipe(
        // Use tap to process the incoming data and update the component state
        tap((data: Suggestion[]) => {
          this.suggestions = data;
          this.filter(); // Re-filter and sort every time the data stream emits
        })
      ).subscribe({
        error: (err) => console.error('Failed to load suggestions from Firestore:', err)
      });
  }

  /**
   * Updates specific fields of a suggestion document in Firestore.
   */
  private updateSuggestionInFirestore(suggestion: Suggestion): Promise<void> {
    const docRef = doc(this.firestore, `artifacts/${this.appId}/suggestions/${suggestion.id}`);
    
    return updateDoc(docRef, {
      upvotes: suggestion.upvotes,
      downvotes: suggestion.downvotes,
      comments: suggestion.comments,
      comment_count: suggestion.comment_count,
      updated_at: new Date().toISOString() // Optionally update timestamp
    });
  }
  // --- END FIREBASE/FIRESTORE FUNCTIONS ---


  // --- LOCAL STORAGE FUNCTIONS (FOR USER VOTES ONLY - PENDING MIGRATION) ---
  private loadUserVotes(): void {
    const upvotesStored = localStorage.getItem(this.UPVOTES_KEY);
    const downvotesStored = localStorage.getItem(this.DOWNVOTES_KEY);
    this.userUpvotes = this.isBrowser && upvotesStored ? JSON.parse(upvotesStored) : [];
    this.userDownvotes = this.isBrowser && downvotesStored ? JSON.parse(downvotesStored) : [];
  }

  private saveUserVotes(): void {
    if (this.isBrowser) {
      localStorage.setItem(this.UPVOTES_KEY, JSON.stringify(this.userUpvotes));
      localStorage.setItem(this.DOWNVOTES_KEY, JSON.stringify(this.userDownvotes));
    }
  }
  // --- END LOCAL STORAGE FUNCTIONS ---


  filter() {
    const term = this.searchQuery.toLowerCase().trim();

    this.filteredSuggestions = this.suggestions.filter(s => {
      if (!s.is_public) return false;

      const matchesSearch =
        s.title.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
      const matchesTag = this.selectedTag === 'All' || s.tags.includes(this.selectedTag);
      const matchesCategory =
        this.selectedCategory === 'All' || s.category === this.selectedCategory;

      return matchesSearch && matchesTag && matchesCategory;
    });

    this.filteredSuggestions = this.sortSuggestions(this.filteredSuggestions);
  }

  private sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return [...suggestions].sort((a, b) => {
      switch (this.sortOrder) {
        case 'votes':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'solved':
          const aSolved = a.status === 'Solved' || a.status === 'Closed' ? 1 : 0;
          const bSolved = b.status === 'Solved' || b.status === 'Closed' ? 1 : 0;
          return bSolved - aSolved;
        case 'unsolved':
          const aUnsolved = a.status !== 'Solved' && a.status !== 'Closed' ? 1 : 0;
          const bUnsolved = b.status !== 'Solved' && b.status !== 'Closed' ? 1 : 0;
          return bUnsolved - aUnsolved;
        default:
          return 0;
      }
    });
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.suggestions.forEach(s => s.tags.forEach(tag => tags.add(tag)));
    return ['All', ...Array.from(tags)];
  }

  upvote(s: Suggestion, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (!this.isBrowser || !this.isLoggedIn) {
      alert("You must be logged in to vote.");
      return; 
    }

    if (this.userUpvotes.includes(s.id)) {
      s.upvotes--;
      this.userUpvotes = this.userUpvotes.filter(v => v !== s.id);
    } else {
      s.upvotes++;
      this.userUpvotes.push(s.id);
      if (this.userDownvotes.includes(s.id)) {
        s.downvotes--;
        this.userDownvotes = this.userDownvotes.filter(v => v !== s.id);
      }
    }
    
    // 🔥 Persist vote change to Firestore
    this.updateSuggestionInFirestore(s);
    // Persist local vote state (pending Firestore migration)
    this.saveUserVotes();
  }

  downvote(s: Suggestion, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (!this.isBrowser || !this.isLoggedIn) {
      alert("You must be logged in to vote.");
      return; 
    }

    if (this.userDownvotes.includes(s.id)) {
      s.downvotes--;
      this.userDownvotes = this.userDownvotes.filter(v => v !== s.id);
    } else {
      s.downvotes++;
      this.userDownvotes.push(s.id);
      if (this.userUpvotes.includes(s.id)) {
        s.upvotes--;
        this.userUpvotes = this.userUpvotes.filter(v => v !== s.id);
      }
    }
    
    // 🔥 Persist vote change to Firestore
    this.updateSuggestionInFirestore(s);
    // Persist local vote state (pending Firestore migration)
    this.saveUserVotes();
  }

  openSuggestion(s: Suggestion) {
    if (!this.isBrowser) return;
    this.selectedSuggestion = s;
    import('bootstrap').then(({ Modal }) => {
      const modalEl = document.getElementById('suggestionModal');
      if (modalEl) {
        const modal = new Modal(modalEl);
        modal.show();
      }
    });
  }

  closeSuggestion() {
    // Close logic
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  hasUpvoted(s: Suggestion): boolean {
    return this.userUpvotes.includes(s.id);
  }

  hasDownvoted(s: Suggestion): boolean {
    return this.userDownvotes.includes(s.id);
  }


  addComment() {
    // 1. 🔥 PROFILE CHECK: Prevent banned or logged-out users from commenting
    if (!this.isLoggedIn) {
      console.error('Comment submission failed: User not logged in.');
      alert("You must be logged in to submit a comment.");
      return;
    }
    
    if (this.isBanned) {
      console.error('Comment submission failed: Banned users cannot comment.');
      alert("Banned users cannot submit comments.");
      return;
    }

    // 2. Validation
    if (!this.user_id) {
      console.error('Comment submission failed: User ID (randomId) missing.');
      return;
    }
    if (!this.newComment.trim() || !this.selectedSuggestion) return;

    // 3. Create new comment object
    const newCommentObject: Comment = {
      user_id: this.user_id, // Use the public randomId from AuthService
      text: this.newComment.trim(),
      timestamp: new Date().toISOString()
    };

    // 4. Update local state 
    if (!this.selectedSuggestion.comments) {
      this.selectedSuggestion.comments = [];
    }

    this.selectedSuggestion.comments.push(newCommentObject); 
    this.selectedSuggestion.comment_count = (this.selectedSuggestion.comments.length);
    this.newComment = '';

    // 5. 🔥 PERSISTENCE: Write the updated comments array and count back to Firestore
    this.updateSuggestionInFirestore(this.selectedSuggestion);
  }
}