import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllSuggestions } from './all-suggestions';

describe('AllSuggestions', () => {
  let component: AllSuggestions;
  let fixture: ComponentFixture<AllSuggestions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllSuggestions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllSuggestions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
