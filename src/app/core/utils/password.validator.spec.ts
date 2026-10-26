import { FormControl } from '@angular/forms';
import { strictPasswordValidator } from './password.validator';

describe('strictPasswordValidator', () => {
  it('should return null for empty value (optional until Validators.required applies)', () => {
    expect(strictPasswordValidator(new FormControl(''))).toBeNull();
  });

  it('should validate minlength of 8 characters', () => {
    const res = strictPasswordValidator(new FormControl('Ab1'));
    expect(res).toHaveProperty('minlength');
  });

  it('should require at least one uppercase letter', () => {
    const res = strictPasswordValidator(new FormControl('abcdefg1'));
    expect(res).toHaveProperty('missingUppercase');
  });

  it('should require at least one lowercase letter', () => {
    const res = strictPasswordValidator(new FormControl('ABCDEFG1'));
    expect(res).toHaveProperty('missingLowercase');
  });

  it('should require at least one number', () => {
    const res = strictPasswordValidator(new FormControl('Abcdefgh'));
    expect(res).toHaveProperty('missingNumber');
  });

  it('should return null when password fulfills all criteria', () => {
    expect(strictPasswordValidator(new FormControl('Password123'))).toBeNull();
  });
});
