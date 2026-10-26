import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validador estricto según HU-02:
 * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número.
 */
export function strictPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || '';
  if (!value) return null;

  const errors: ValidationErrors = {};
  if (value.length < 8) errors['minlength'] = true;
  if (!/[A-Z]/.test(value)) errors['missingUppercase'] = true;
  if (!/[a-z]/.test(value)) errors['missingLowercase'] = true;
  if (!/\d/.test(value)) errors['missingNumber'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
}
