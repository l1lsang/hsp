import { type AuthenticatedUser } from './http.js';
export declare const ALLOWED_SPACES: Set<string>;
export declare function createBooking(user: AuthenticatedUser, body: Record<string, unknown>): Promise<string>;
export declare function cancelBooking(user: AuthenticatedUser, bookingId: string): Promise<void>;
export declare function setSpaceStatus(user: AuthenticatedUser, spaceId: string, bookingDisabled: unknown): Promise<void>;
export declare function createBlock(user: AuthenticatedUser, body: Record<string, unknown>): Promise<string>;
export declare function listBookings(user: AuthenticatedUser, includeAll: boolean): Promise<{
    id: string;
    spaceId: any;
    date: string;
    start: string;
    end: string;
    purpose: any;
    status: any;
    userName: any;
    userEmail: any;
}[]>;
export declare function getAvailability(spaceId: string, date: string): Promise<{
    slots: string[];
    bookingDisabled: boolean;
}>;
