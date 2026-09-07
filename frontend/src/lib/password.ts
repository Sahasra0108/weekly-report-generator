 export const MIN_LENGTH = 8;
export const MAX_LENGTH = 72;

const SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{};:,.<>?/\\|~`'\"";

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export function checkPassword(password: string, email?: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      id: "letter",
      label: "Contains a letter",
      met: /[A-Za-z]/.test(password),
    },
    {
      id: "number",
      label: "Contains a number",
      met: /\d/.test(password),
    },
    {
      id: "special",
      label: "Contains a special character",
      met: [...password].some((char) => SPECIAL_CHARACTERS.includes(char)),
    },
    {
      id: "not-email",
      label: "Not the same as your email",
      met:
        password.length === 0 ||
        !email ||
        password.toLowerCase() !== email.toLowerCase(),
    },
  ];
}

export function passwordIsValid(password: string, email?: string): boolean {
  return (
    password.length <= MAX_LENGTH &&
    checkPassword(password, email).every((rule) => rule.met)
  );
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (password.length === 0) return { score: 0, label: "" };

  const rules = checkPassword(password);
  const met = rules.filter((r) => r.met).length;
  const long = password.length >= 12;
  const varied = /[a-z]/.test(password) && /[A-Z]/.test(password);

  if (met < 4) return { score: 1, label: "Weak" };
  if (long && varied) return { score: 3, label: "Strong" };
  return { score: 2, label: "Good" };
}