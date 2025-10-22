import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgIf } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { Subscription } from 'rxjs';

// 🔥 Import Firestore and necessary functions
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

// 🔥 Import the new services
import { AuthService, UserState } from '../../core/account-state';
import { Gemini } from '../../core/gemini';
declare const __app_id: string; 


interface Suggestion {
  post_id: string;
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
  comments: any[]; 
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}

// --- COMPONENT ---

@Component({
  selector: 'app-new-suggestion',
  standalone: true, 
  imports: [CommonModule, FormsModule, MarkdownModule, NgIf],
  templateUrl: './new-suggestion.html',
  styleUrls: ['./new-suggestion.scss'],
})
export class NewSuggestion implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private cd = inject(ChangeDetectorRef);
  
  // 🔥 INJECT THE GEMINI SERVICE
  private geminiService = inject(Gemini); 

  // State properties
  private authSubscription!: Subscription;
  isLoggedIn = false;
  currentUserId: string | null = null;
  user_id: string | null = null; 
  is_banned: boolean = false;
  submissionMessage = '';
  
  // 🔥 New state for AI summary process
  isSummarizing = false;

  // Form properties
  title = '';
  description = '';
  preview = false;
  tagInput = '';
  parsedTags: string[] = [];
  selectedCategory = '';
  fontSize = 14;

  categories = [
    'Academics & Curriculum',
    'Campus Facilities & Maintenance',
    'Technology & IT',
    'Student Support Services',
    'Food & Dining',
    'Safety & Security',
    'Other',
  ];

  ngOnInit(): void {
    this.authSubscription = this.authService.userState$.subscribe((state: UserState) => {
      this.isLoggedIn = state.isLoggedIn;
      this.user_id = state.randomId; 
      this.is_banned = state.isBanned;
      
      this.submissionMessage = '';
      
      if (!this.isLoggedIn) {
        this.submissionMessage = 'You must be logged in to submit a new suggestion.';
      } else if (this.is_banned) {
        this.submissionMessage = 'Your account is banned from making submissions.';
      }
      
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // --- Utility Methods ---
  addTag(event: Event): void {
    const input = event.target as HTMLInputElement;
    const key = (event as KeyboardEvent).key;

    if (key !== 'Enter' && key !== ' ') return;
    event.preventDefault();

    const trimmedTag = input.value.trim();

    if (trimmedTag && !this.parsedTags.includes(trimmedTag)) {
      this.parsedTags.push(trimmedTag);
    }
    this.tagInput = '';
  }

  removeTag(index: number) {
    this.parsedTags.splice(index, 1);
  }

  formatMarkdown(tag: 'bold' | 'italic') {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (!textarea || textarea.tagName.toLowerCase() !== 'textarea') {
      const wrapper = tag === 'bold' ? '**' : '*';
      this.description += `${wrapper}text${wrapper}`;
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.description.substring(start, end);
    const wrapper = tag === 'bold' ? '**' : '*';
    const formattedText = `${wrapper}${selectedText}${wrapper}`;

    this.description =
      this.description.substring(0, start) + formattedText + this.description.substring(end);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos =
        start + wrapper.length + (selectedText.length > 0 ? selectedText.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  sizeUp() {
    this.fontSize += 2;
  }

  sizeDown() {
    if (this.fontSize > 6) this.fontSize -= 2;
  }

  // 🗑️ ORIGINAL getsummary() method replaced by AI summary in submit()
  // getsummary(): string {
  //   return this.description.substring(0, 100).trim() + '...';
  // }
  
  resetForm() {
    this.title = '';
    this.description = '';
    this.parsedTags = [];
    this.tagInput = '';
    this.preview = false;
    this.selectedCategory = '';
    this.fontSize = 14;
    this.submissionMessage = ''; // Ensure message is reset
  }


  async submit() {
    this.submissionMessage = '';

    if (!this.isLoggedIn || !this.user_id) {
      this.submissionMessage = 'You must be logged in to submit a suggestion.';
      console.warn('Submission blocked: User not logged in or ID missing.');
      return;
    }
    
    if (this.is_banned) {
      this.submissionMessage = 'Submission failed. Your account is currently banned.';
      console.warn('Submission blocked: User is banned.');
      return;
    }

    if (!this.title || !this.description || !this.selectedCategory) {
      this.submissionMessage = 'Please fill all required fields (Title, Description, Category)!';
      return;
    }
    
    this.isSummarizing = true;
    this.submissionMessage = 'Generating AI summary...';

    let aiSummary = '';

    try {
      // 🔥 STEP 1: Await the AI Summary Generation
      aiSummary = await this.generateAiSummary();
      this.submissionMessage = 'Submitting suggestion...';
      
    } catch (error) {
      // Handle AI failure gracefully by falling back to the manual summary
      console.error('AI Summary Generation Failed, falling back to manual summary.', error);
      aiSummary = this.description.substring(0, 100).trim() + '...';
      this.submissionMessage = 'AI summary failed. Submitting with default summary...';
    } finally {
      this.isSummarizing = false;
    }


    // 🔥 STEP 2: Construct the data using the AI-generated summary
    const suggestionData: Omit<Suggestion, 'id'> = {
      user_id: this.user_id,
      post_id: crypto.randomUUID(),
      title: this.title,
      description: this.description,
      summary: aiSummary, // 👈 USE THE AI SUMMARY HERE
      tags: this.parsedTags,
      category: this.selectedCategory,
      upvotes: 0,
      downvotes: 0,
      solved: false,
      status: 'Pending',
      priority: 'Undefined',
      comments: [],
      comment_count: 0,
      attachments: [],
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
    };

    // 🔥 STEP 3: Submit to Firestore
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      
      const suggestionsCollectionRef = collection(
        this.firestore,
        `artifacts/${appId}/suggestions`
      );

      await addDoc(suggestionsCollectionRef, suggestionData);

      this.resetForm();
      this.submissionMessage = 'Suggestion successfully submitted!';
      
    } catch (e) {
      console.error('Error adding document: ', e);
      this.submissionMessage = 'Submission failed due to an internal error.';
    }
    
    setTimeout(() => (this.submissionMessage = ''), 5000);
  }
  
  /**
   * Helper function to call the Gemini Service and convert the Observable to a Promise.
   */
  private generateAiSummary(): Promise<string> {
      return new Promise((resolve, reject) => {
          this.geminiService.generateSummary(this.description).subscribe({
              next: (summary: string) => resolve(summary),
              error: (err) => reject(err),
          });
      });
  }
}