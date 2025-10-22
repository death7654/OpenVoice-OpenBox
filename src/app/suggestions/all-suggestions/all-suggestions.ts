import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MarkdownModule, MarkdownComponent } from 'ngx-markdown';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';

declare var bootstrap: any;


interface Suggestion {
  id: string;
  title: string;
  description: string;
  tags: string[];
  solved: boolean;
  category: string;
  upvotes: number;
  downvotes: number;
  priority: string;
  status: string;
  updated_at: string;
  created_at: string;
  resolved_at: string;
  comments: string[];
  comment_count: number;
  attachments: string[];
  is_public: boolean;
}

@Component({
  selector: 'app-all-suggestions',
  standalone: true,
  imports: [MarkdownComponent, CommonModule, FormsModule, MarkdownModule, SlicePipe],
  templateUrl: './all-suggestions.html',
})
export class AllSuggestions implements OnInit {
  suggestions: Suggestion[] = [];
  filteredSuggestions: Suggestion[] = [];
  searchQuery = '';
  selectedTag = 'All';
  selectedCategory = 'All';
  isBrowser = false;
  sortOrder: 'votes' | 'newest' | 'oldest' | 'solved' | 'unsolved' = 'votes';
  userUpvotes: string[] = [];
  userDownvotes: string[] = [];

  selectedSuggestion: Suggestion | null = null;

  private readonly UPVOTES_KEY = 'userUpvotes';
  private readonly DOWNVOTES_KEY = 'userDownvotes';

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
      this.filter();
    }
  }

  // Getter for public suggestions
  get publicSuggestions(): Suggestion[] {
    return this.suggestions.filter(s => s.is_public);
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

  search() {
    this.filter();
  }

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
        // Solved first
        const aSolved = a.status === 'Solved' || a.status === 'Closed' ? 1 : 0;
        const bSolved = b.status === 'Solved' || b.status === 'Closed' ? 1 : 0;
        return bSolved - aSolved;

      case 'unsolved':
        // Unsolved first
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

  upvote(s: Suggestion) {
    if (!this.isBrowser) return;

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

  openSuggestion(s: Suggestion) {
  this.selectedSuggestion = s;

  const modalEl = document.getElementById('suggestionModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

  downvote(s: Suggestion) {
    if (!this.isBrowser) return;

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
}
