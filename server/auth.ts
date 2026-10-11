import crypto from 'crypto';
import { execFileSync } from 'child_process';
import type { Profile, UserRole } from './types.ts';

type AuthRow = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  password_hash: string;
  created_at: string;
};

type SessionRow = { user_id: string; expires_at: string };

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const restUrl = `${supabaseUrl}/rest/v1`;

function configured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}

function request(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): any {
  if (!configured()) throw new Error('Server authentication is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  const args = ['-fsS', '--max-time', '8', '-X', method, `${restUrl}${path}`, '-H', `apikey: ${serviceRoleKey}`, '-H', `Authorization: Bearer ${serviceRoleKey}`, '-H', 'Content-Type: application/json'];
  if (body !== undefined) args.push('-H', 'Prefer: return=representation', '--data-binary', JSON.stringify(body));
  try {
    const output = execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return output ? JSON.parse(output) : null;
  } catch (error) {
    throw new Error(`Authentication database request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:v1:${salt.toString('base64')}:${derived.toString('base64')}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [, version, saltEncoded, digestEncoded] = encoded.split(':');
  if (version !== 'v1' || !saltEncoded || !digestEncoded) return false;
  try {
    const expected = Buffer.from(digestEncoded, 'base64');
    const actual = crypto.scryptSync(password, Buffer.from(saltEncoded, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function toProfile(user: AuthRow): Profile {
  return { id: user.id, email: user.email, display_name: user.display_name, role: user.role, created_at: user.created_at };
}

export function isAuthConfigured(): boolean {
  return configured();
}

export function hasAdminAccount(): boolean {
  const rows = request('GET', `/tdh_auth_users?role=in.(admin,owner)&select=id&limit=1`) as Array<{ id: string }>;
  return rows.length > 0;
}

export function createAccount(emailInput: string, displayNameInput: string, password: string, role: UserRole): Profile {
  const email = emailInput.trim().toLowerCase();
  const displayName = displayNameInput.trim() || email.split('@')[0];
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const existing = request('GET', `/tdh_auth_users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`) as Array<{ id: string }>;
  if (existing.length) throw new Error('An account with this email already exists.');
  const rows = request('POST', '/tdh_auth_users', [{ id: crypto.randomUUID(), email, display_name: displayName, role, password_hash: hashPassword(password) }]) as AuthRow[];
  if (!rows?.[0]) throw new Error('Account creation failed.');
  return toProfile(rows[0]);
}

export function authenticate(emailInput: string, password: string): Profile {
  const email = emailInput.trim().toLowerCase();
  const rows = request('GET', `/tdh_auth_users?email=eq.${encodeURIComponent(email)}&select=id,email,display_name,role,password_hash,created_at&limit=1`) as AuthRow[];
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error('Invalid email or password.');
  return toProfile(user);
}

export function createSession(emailInput: string, password: string): { token: string; profile: Profile; expiresAt: string } {
  const profile = authenticate(emailInput, password);
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  request('POST', '/tdh_auth_sessions', [{ id: crypto.randomUUID(), user_id: profile.id, token_hash: hashToken(token), expires_at: expiresAt }]);
  return { token, profile, expiresAt };
}

export function getSession(token: string | undefined): Profile | null {
  if (!token) return null;
  const sessions = request('GET', `/tdh_auth_sessions?token_hash=eq.${encodeURIComponent(hashToken(token))}&select=user_id,expires_at&limit=1`) as SessionRow[];
  const session = sessions[0];
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const users = request('GET', `/tdh_auth_users?id=eq.${encodeURIComponent(session.user_id)}&select=id,email,display_name,role,created_at&limit=1`) as AuthRow[];
  const user = users[0];
  if (!user) return null;
  request('PATCH', `/tdh_auth_sessions?token_hash=eq.${encodeURIComponent(hashToken(token))}`, { last_seen_at: new Date().toISOString() });
  return toProfile(user);
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  request('DELETE', `/tdh_auth_sessions?token_hash=eq.${encodeURIComponent(hashToken(token))}`);
}
