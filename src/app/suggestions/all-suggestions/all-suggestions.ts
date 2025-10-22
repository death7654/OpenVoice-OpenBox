import { Component, OnInit, Inject, PLATFORM_ID, Input, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule, MarkdownComponent } from 'ngx-markdown';
import { SlicePipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { AuthService, UserState } from '../../core/account-state';
import { Subscription } from 'rxjs'; 

interface Comment {
  user_id: string;
  text: string;
  timestamp: string;
}

interface Suggestion {
  id: string;
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

@Component({
  selector: 'app-all-suggestions',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, MarkdownComponent, SlicePipe],
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
  private authSubscription!: Subscription; 
  private authService = Inject(AuthService); 

  private lastSearchQuery = '';
  private lastSelectedTag = 'All';
  private lastSelectedCategory = 'All';
  private lastSortOrder: 'votes' | 'newest' | 'oldest' | 'solved' | 'unsolved' = 'votes';


  selectedSuggestion: Suggestion | null = null;
  private suggestionModal: Modal | null = null;

  user_id: string | null = null;

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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.loadSuggestions();
      this.loadUserVotes();
      
      this.authSubscription = this.authService.userState$.subscribe((state: UserState) => {
        this.isLoggedIn = state.isLoggedIn;
        this.user_id = state.accountId;
      });

      this.filter();
      this.filteredSuggestions = [...this.suggestions];
      this.filteredSuggestions = this.sortSuggestions(this.filteredSuggestions);
    }
  }
  
  ngOnDestroy(): void {
      if (this.authSubscription) {
          this.authSubscription.unsubscribe();
      }
  }

  private loadSuggestions(): void {
    const stored = localStorage.getItem('suggestions');
    this.suggestions = stored ? JSON.parse(stored) : [];
  }

  private loadUserVotes(): void {
    const upvotesStored = localStorage.getItem(this.UPVOTES_KEY);
    const downvotesStored = localStorage.getItem(this.DOWNVOTES_KEY);
    this.userUpvotes = upvotesStored ? JSON.parse(upvotesStored) : [];
    this.userDownvotes = downvotesStored ? JSON.parse(downvotesStored) : [];
  }

  filter() {
     if 
       (this.searchQuery === this.lastSearchQuery &&
        this.selectedTag === this.lastSelectedTag &&
        this.selectedCategory === this.lastSelectedCategory &&
        this.sortOrder === this.lastSortOrder)
    {
     return;
    }

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
    if (!this.isBrowser || !this.isLoggedIn) return; 

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
    this.save();
    this.saveUserVotes();
    this.filter();
  }

  downvote(s: Suggestion, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (!this.isBrowser || !this.isLoggedIn) return; 

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
    this.save();
    this.saveUserVotes();
    this.filter();
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
    if (this.suggestionModal) {
      this.suggestionModal.hide();
    }
  }

  save() {
    if (this.isBrowser) {
      localStorage.setItem('suggestions', JSON.stringify(this.suggestions));
    }
  }

  private saveUserVotes(): void {
    if (this.isBrowser) {
      localStorage.setItem(this.UPVOTES_KEY, JSON.stringify(this.userUpvotes));
      localStorage.setItem(this.DOWNVOTES_KEY, JSON.stringify(this.userDownvotes));
    }
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
  if (!this.isLoggedIn || !this.user_id) {
    console.error('Comment submission failed: User not logged in or user_id missing.');
    return;
  }
  if (!this.newComment.trim() || !this.selectedSuggestion) return;

  const newCommentObject: Comment = {
    user_id: this.user_id,
    text: this.newComment.trim(),
    timestamp: new Date().toISOString() 
  };

  if (!this.selectedSuggestion.comments) {
    this.selectedSuggestion.comments = [];
  }

  this.selectedSuggestion.comments.push(newCommentObject); 
  
  this.newComment = '';
  this.selectedSuggestion.comment_count = (this.selectedSuggestion.comments.length); // Use length for count

  const index = this.suggestions.findIndex(s => s.id === this.selectedSuggestion!.id);
  if (index > -1) {
    this.suggestions[index] = this.selectedSuggestion; 
    this.save();
  }
}
}