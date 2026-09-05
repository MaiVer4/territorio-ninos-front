import { TestBed } from '@angular/core/testing';

import { Atraccion } from './atraccion';

describe('Atraccion', () => {
  let service: Atraccion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Atraccion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
