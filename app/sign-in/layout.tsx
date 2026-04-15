import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in | King Dice',
  description: 'Sign in to King Dice — board game rules, community, and tools.',
  robots: { index: true, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
