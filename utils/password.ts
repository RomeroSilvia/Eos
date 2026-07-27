export const PASSWORD_REQUIREMENTS_TEXT =
  'Mínimo 8 caracteres, con al menos una mayúscula, un número y un carácter especial (ej. !@#$%^&*).';

export function isValidPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /\d/.test(value) &&
    /[A-Z]/.test(value) &&
    /[!@#$%^&*]/.test(value)
  );
}
