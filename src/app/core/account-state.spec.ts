import { TestBed } from '@angular/core/testing';

import { AccountState } from './account-state';

describe('AccountState', () => {
  let service: AccountState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
