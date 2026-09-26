/**
 * Password rule shared by the in-app "change password" modal and the
 * /lab/reset-password flow (they used to disagree: 6 chars vs 8+complexity).
 * Keep in sync with Supabase Dashboard → Authentication → Password settings.
 * Returns an error message, or null when the password is acceptable.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must be at least 8 characters with uppercase, lowercase and a number.';
  }
  return null;
}

export const PASSWORD_HINT = 'Min 8 characters, with uppercase, lowercase and a number.';
