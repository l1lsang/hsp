import type { VercelRequest } from '@vercel/node';
import { type AuthenticatedUser } from './http.js';
export declare function createAdminSession(user: AuthenticatedUser, password: unknown): string;
export declare function requireAdminSession(req: VercelRequest, user: AuthenticatedUser): void;
