import type { VercelRequest, VercelResponse } from '@vercel/node';
export interface AuthenticatedUser {
    uid: string;
    email: string;
    name: string;
    admin: boolean;
}
export declare class HttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare function authenticate(req: VercelRequest): Promise<AuthenticatedUser>;
export declare function sendError(res: VercelResponse, error: unknown): void;
export declare function singleParam(value: string | string[] | undefined): string;
