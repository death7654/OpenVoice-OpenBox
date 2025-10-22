import {
  Component,
  OnInit,
  signal,
  computed,
  Inject,
  PLATFORM_ID,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navigation } from '../navigation/navigation';
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 🔥 FIREBASE IMPORTS
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';

// 🔥 AUTH SERVICE for admin access/user profile updates
// NOTE: This is still required for handling user profile updates (banning)
import { AuthService } from '../core/account-state';

declare var bootstrap: any;
declare const __app_id: string;

interface Comment {
  id?: string; // Optional, if comments have their own ID
  text: string;
  userId: string; // The user who made the comment
  createdAt: string; // ISO date string // Add any other fields your actual comment object has (e.g., userName, etc.)
}

// --- UPDATE SUGGESTION INTERFACE ---
interface Suggestion {
  id: string; // Firestore Document ID
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

interface UserProfile {
  firebaseUid: string;
  prn: string;
  random_id: string; // Public ID
  internal_email: string;
  isBanned: boolean;
}

type SortColumn =
  | 'title'
  | 'category'
  | 'priority'
  | 'status'
  | 'is_public'
  | 'upvotes'
  | 'created_at';
type SortDirection = 'asc' | 'desc';

// 🔥 LOCAL ADMIN CREDENTIALS
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';
// --------------------

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation],
  templateUrl: './admin.html',
  styleUrls: [],
})
export class Admin implements OnInit, OnDestroy {
  // --- DEPENDENCIES ---
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private suggestionsSubscription!: Subscription;
  private usersSubscription!: Subscription;
  private appId: string;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }

  // --- SIGNAL STATE ---
  isLoggedIn = signal(false);
  usernameInput = signal('');
  passwordInput = signal('');
  loginError = signal('');

  // Data State
  suggestions = signal<Suggestion[]>([]);
  allUsers = signal<UserProfile[]>([]);

  // UI State
  filterText = signal('');
  activeTab = signal<'suggestions' | 'users'>('suggestions');

  // Editing/Modal State
  editingSuggestion = signal<Suggestion | null>(null);
  editingUser = signal<UserProfile | null>(null);

  // Sorting State
  sortColumn = signal<SortColumn>('created_at');
  sortDirection = signal<SortDirection>('desc');

  isBrowser = false;
  categories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other',
  ];

  // --- COMPUTED SIGNAL for Filtered/Sorted Suggestions ---
  sortedSuggestions = computed(() => {
    const term = this.filterText().toLowerCase().trim();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    let filtered = this.suggestions();

    if (term) {
      filtered = filtered.filter(
        (s) => s.title.toLowerCase().includes(term) || s.category.toLowerCase().includes(term)
      );
    }

    return filtered.slice().sort((a, b) => {
      let comparison = 0;
      // Basic comparison for demonstration
      if (column === 'upvotes') {
        comparison = a.upvotes - b.upvotes;
      } else {
        // Safe type casting for comparison
        comparison = String(a[column as keyof Suggestion]).localeCompare(
          String(b[column as keyof Suggestion])
        );
      }
      return direction === 'desc' ? comparison * -1 : comparison;
    });
  });

  // --- INITIALIZATION ---
  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnDestroy(): void {
    if (this.suggestionsSubscription) {
      this.suggestionsSubscription.unsubscribe();
    }
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
  }

  // --- CORE ADMIN LOGIC ---

  /**
   * 🔥 LOCAL LOGIN IMPLEMENTATION
   */
  login(): void {
    this.loginError.set('');
    // Use the simplified local 'admin' / 'admin' credentials
    if (this.usernameInput() === DEFAULT_USERNAME && this.passwordInput() === DEFAULT_PASSWORD) {
      this.isLoggedIn.set(true);
      this.usernameInput.set('');
      this.passwordInput.set('');
      this.loadSuggestionsFromFirestore();
      this.loadUsersFromFirestore();
    } else {
      this.loginError.set('Invalid username or password.');
    }
  }

  logout(): void {
    this.isLoggedIn.set(false);
    if (this.suggestionsSubscription) this.suggestionsSubscription.unsubscribe();
    if (this.usersSubscription) this.usersSubscription.unsubscribe();
  }

  // --- TAB MANAGEMENT ---
  setActiveTab(tab: 'suggestions' | 'users'): void {
    this.activeTab.set(tab);
  }

  // --- FIRESTORE SUGGESTION METHODS ---

  private loadSuggestionsFromFirestore(): void {
  const path = `artifacts/${this.appId}/suggestions`;
  const suggestionsCollection = collection(this.firestore, path);
  const suggestionsQuery = query(suggestionsCollection, orderBy('created_at', 'desc'));

  this.suggestionsSubscription = (
    collectionData(suggestionsQuery, { idField: 'id' }) as Observable<Suggestion[]>
  )
    .pipe(
      map((suggestions: Suggestion[]) => {
        // Map over each suggestion
        return suggestions.map((suggestion) => {
          // Map over each comment in the suggestion
          const processedComments = suggestion.comments.map((comment) => {
            // Check if createdAt exists and has a toDate method (i.e., it's a Timestamp object)
            if (comment.createdAt && typeof (comment.createdAt as any).toDate === 'function') {
              // Convert the Firestore Timestamp object to a JavaScript Date object
              // DatePipe can handle both Date objects and ISO strings.
              comment.createdAt = (comment.createdAt as any).toDate().toISOString();
            }
            return comment;
          });

          // Return the suggestion with processed comments
          return {
            ...suggestion,
            comments: processedComments,
          } as Suggestion;
        });
      })
    )
    .subscribe({
      next: (data: Suggestion[]) => this.suggestions.set(data),
      error: (err) => console.error('Failed to load suggestions:', err),
    });
}

  private updateSuggestionInFirestore(id: string, data: Partial<Suggestion>): Promise<void> {
    const docRef = doc(this.firestore, `artifacts/${this.appId}/suggestions/${id}`);
    return updateDoc(docRef, data);
  }

  // --- FIRESTORE USER MANAGEMENT METHODS ---
  private loadUsersFromFirestore(): void {
    const path = `artifacts/${this.appId}/users`;
    const usersCollection = collection(this.firestore, path);

    // Define a temporary type that represents the Firestore document data + the 'id' field
    // UserProfileData = All fields EXCEPT firebaseUid, PLUS the 'id' field.
    type UserProfileData = Omit<UserProfile, 'firebaseUid'> & { id: string };

    this.usersSubscription = // 1. Tell collectionData to use 'id' as the document key field
      (collectionData(usersCollection, { idField: 'id' }) as Observable<UserProfileData[]>)
        .pipe(
          map((docs) =>
            docs.map((doc) => {
              // Destructure 'id' from the document (now safe because of the UserProfileData cast)
              const { id, ...rest } = doc;

              return {
                ...rest,
                // 🔥 FIX: Map the existing 'id' field to your desired 'firebaseUid' property
                firebaseUid: id,
              } as UserProfile;
            })
          )
        )
        .subscribe({
          next: (data: UserProfile[]) => {
            this.allUsers.set(data);
          },
          error: (err) => console.error('Failed to load user profiles:', err),
        });
  }
  private async updateUserProfile(uid: string, data: { isBanned: boolean }): Promise<void> {
    const docRef = doc(this.firestore, `artifacts/${this.appId}/users/${uid}`);
    return updateDoc(docRef, data);
  }

  // --- USER MANAGEMENT UI ACTIONS ---

  openBanModal(user: UserProfile): void {
    this.editingUser.set(user);
    console.log(user);
    if (this.isBrowser) {
      setTimeout(() => {
        const modalElement = document.getElementById('banUserModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      }, 0);
    }
  }

  async toggleBanStatus(user: UserProfile): Promise<void> {
    const newStatus = !user.isBanned;

    if (confirm(`Are you sure you want to ${newStatus ? 'BAN' : 'UNBAN'} user ${user.prn}?`)) {
      try {
        await this.updateUserProfile(user.firebaseUid, { isBanned: newStatus });

        console.log(`User ${user.prn} status updated to isBanned: ${newStatus}`);
        alert(`User ${user.prn} has been ${newStatus ? 'banned' : 'unbanned'}.`);

        // Close modal
        const modalElement = document.getElementById('banUserModal');
        if (modalElement) {
          const modalInstance = bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) modalInstance.hide();
        }
      } catch (error) {
        console.error('Failed to update ban status:', error);
        alert('Error updating user status. Check console.');
      }
    }
  }

  // --- SUGGESTION ACTIONS (saveAll, deleteSuggestion, etc.) ---

  sortSuggestions(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      const defaultDir: SortDirection =
        column === 'upvotes' || column === 'created_at' ? 'desc' : 'asc';
      this.sortDirection.set(defaultDir);
    }
  }

  async saveAll(): Promise<void> {
    const suggestionsToUpdate = this.suggestions();
    const updatePromises: Promise<void>[] = [];

    suggestionsToUpdate.forEach((s) => {
      const isTerminalStatus = ['Solved', 'Closed'].includes(s.status);
      s.solved = isTerminalStatus;

      let updateData: Partial<Suggestion> = {
        title: s.title,
        category: s.category,
        priority: s.priority,
        status: s.status,
        is_public: s.is_public,
        solved: s.solved,
        comment_count: s.comments.length,
        updated_at: new Date().toISOString(),
        // Ensure resolved_at is handled for terminal status changes
      };

      if (isTerminalStatus && !s.resolved_at) {
        updateData.resolved_at = new Date().toISOString().substring(0, 16);
      } else if (!isTerminalStatus && s.resolved_at) {
        updateData.resolved_at = null;
      }

      updatePromises.push(this.updateSuggestionInFirestore(s.id, updateData));
    });

    try {
      await Promise.all(updatePromises);
      alert('All changes saved successfully to Firestore!');
    } catch (error) {
      console.error('Error saving bulk updates:', error);
      alert('Error saving changes. Check console.');
    }
  }

  async deleteSuggestion(s: Suggestion): Promise<void> {
    if (
      confirm(
        `Are you sure you want to delete the suggestion: "${s.title}"? This cannot be undone.`
      )
    ) {
      try {
        const docRef = doc(this.firestore, `artifacts/${this.appId}/suggestions/${s.id}`);
        await deleteDoc(docRef);
        console.log(`🗑️ Suggestion "${s.title}" deleted from Firestore.`);
      } catch (error) {
        console.error('Failed to delete suggestion:', error);
        alert('Error deleting suggestion. Check console.');
      }
    }
  }

  openCommentsModal(suggestion: Suggestion): void {
    this.editingSuggestion.set(suggestion);
    if (this.isBrowser) {
      setTimeout(() => {
        const modalElement = document.getElementById('commentsModal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      }, 0);
    }
  }

  async deleteComment(index: number): Promise<void> {
    const suggestion = this.editingSuggestion();
    if (!suggestion || !confirm('Are you sure you want to delete this comment?')) return; // suggestion.comments is now Comment[]

    suggestion.comments.splice(index, 1);
    suggestion.comment_count = suggestion.comments.length;

    try {
      await this.updateSuggestionInFirestore(suggestion.id, {
        // Firestore will store this array of objects correctly.
        comments: suggestion.comments,
        comment_count: suggestion.comment_count,
        updated_at: new Date().toISOString(),
      });
      console.log(`🗑️ Comment deleted and changes saved to Firestore.`);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Error deleting comment. Please check the console.');
    }
  }
}
