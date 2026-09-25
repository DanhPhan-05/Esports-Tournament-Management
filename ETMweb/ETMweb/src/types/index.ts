export type Role = 'Customer' | 'ClubManager' | 'TournamentOrganizer' | 'Administrator';
export type AccountStatus = 'Pending' | 'Active' | 'Locked' | 'Suspended' | 'Inactive';

export interface Account {
  _id: string;
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  systemRole: Role;
  status: AccountStatus;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  privacy?: { showProfile: boolean };
  notificationSettings?: { email: boolean; inApp: boolean };
}
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { page: number; limit: number; total: number };
}
export interface AccountFilters {
  email?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}
export interface ProfileInput {
  fullName: string;
  phone?: string;
  address?: string;
  privacy?: Account['privacy'];
  notificationSettings?: Account['notificationSettings'];
}
export interface StaffInput {
  fullName: string;
  email: string;
  phone?: string;
  systemRole: 'ClubManager' | 'TournamentOrganizer';
}
export interface AccountEdit {
  fullName: string;
  phone?: string;
  systemRole: Role;
  status: AccountStatus;
  verified?: boolean;
}
