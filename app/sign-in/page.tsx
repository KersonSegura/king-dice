import { SignInClient } from './SignInClient';

/**
 * Full-page sign-in when the URL is loaded directly (refresh, external link).
 * In-app navigation to /sign-in uses the intercepted route in @modal/(.)sign-in instead.
 */
export default function SignInPage() {
  return <SignInClient />;
}
