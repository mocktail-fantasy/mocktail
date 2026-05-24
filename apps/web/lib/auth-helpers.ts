import { auth } from '@/auth';

const IS_LOCAL = process.env.NODE_ENV !== 'production';
const LOCAL_USER_ID = 'local-user';

/**
 * Returns the current user's id, or null if not signed in.
 *
 * Local dev: always returns a constant local user id. Local persistence is
 * single-user (a JSON file on disk — see rankings-store.ts) so we don't need
 * NextAuth running. Production: returns the real session user id, or null.
 */
export async function requireUserId(): Promise<string | null> {
  if (IS_LOCAL) return LOCAL_USER_ID;
  const session = await auth();
  return session?.user?.id ?? null;
}
