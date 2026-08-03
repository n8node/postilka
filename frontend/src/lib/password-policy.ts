const hasLower = /[a-z]/;
const hasUpper = /[A-Z]/;
const hasDigit = /[0-9]/;
const hasSpecial = /[^a-zA-Z0-9]/;

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Минимум 8 символов";
  if (!hasLower.test(password)) return "Нужна строчная буква";
  if (!hasUpper.test(password)) return "Нужна заглавная буква";
  if (!hasDigit.test(password)) return "Нужна цифра";
  if (!hasSpecial.test(password)) return "Нужен спецсимвол";
  return null;
}
