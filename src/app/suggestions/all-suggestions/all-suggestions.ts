import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule, MarkdownComponent } from 'ngx-markdown';
import { SlicePipe } from '@angular/common';

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
  imports: [MarkdownComponent, CommonModule, FormsModule, MarkdownModule, SlicePipe],
  templateUrl: './all-suggestions.html',
  styleUrl: './all-suggestions.scss'
})
export class AllSuggestions implements OnInit {
  suggestions: Suggestion[] = [];
  filteredSuggestions: Suggestion[] = [];
  searchQuery = '';
  selectedTag = 'All';
  isBrowser = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      const stored = localStorage.getItem('suggestions');
      this.suggestions = stored ? JSON.parse(stored) : [];
      this.filteredSuggestions = [...this.suggestions];
    }
  }

  search() {
    this.filter();
  }

  filter() {
    this.filteredSuggestions = this.suggestions.filter(s => {
      const matchesSearch =
        s.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesTag =
        this.selectedTag === 'All' || s.tags.includes(this.selectedTag);

      return matchesSearch && matchesTag;
    });
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.suggestions.forEach(s => s.tags.forEach(tag => tags.add(tag)));
    return ['All', ...Array.from(tags)];
  }

  upvote(s: Suggestion) {
    s.upvotes++;
    this.save();
  }

  downvote(s: Suggestion) {
    s.downvotes++;
    this.save();
  }

  save() {
    if (this.isBrowser) {
      localStorage.setItem('suggestions', JSON.stringify(this.suggestions));
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
}
