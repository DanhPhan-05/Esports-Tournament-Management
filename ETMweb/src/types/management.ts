export interface Game {
  _id: string;
  name: string;
  slug: string;
  publisher?: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  teamCount?: number;
  tournamentCount?: number;
}
export interface Club {
  _id: string;
  name: string;
  shortName: string;
  description?: string;
  logoUrl?: string;
  country?: string;
  region?: string;
  contactEmail: string;
  contactPhone?: string;
  isVerified: boolean;
  status: string;
  managerAccountIds: string[];
}
export interface Team {
  _id: string;
  clubId: string;
  name: string;
  tag: string;
  gameId: Game | string;
  status: string;
  logoUrl?: string;
}
export interface Member {
  _id: string;
  fullName: string;
  citizenId?: string;
  citizenIdLast4: string;
  teamId: Team | string | null;
  gameId?: string;
  inGameName?: string;
  teamRole: string;
  activeFrom: string;
  activeUntil: string | null;
  status: string;
}
export interface Tournament {
  bannerUrl?: string;
  _id: string;
  name: string;
  slug: string;
  gameId: Game | string;
  description?: string;
  tournamentType: string;
  status: string;
  maxTeams: number;
  minRosterSize: number;
  maxRosterSize: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  rosterLockAt: string;
  startAt: string;
  endAt: string;
  rules?: string;
  region?: string;
  venue?: string;
  prizePool?: string;
  prizeCurrency?: string;
  postponeReason?: string;
  cancelReason?: string;
}
export interface Application {
  _id: string;
  teamId: Team | null;
  tournamentId: Tournament | string;
  status: string;
  submittedAt?: string;
}
export interface Match {
  _id: string;
  round: number;
  position: number;
  teamAId: Team | null;
  teamBId: Team | null;
  scheduledAt?: string;
  status: string;
}
export interface TournamentReport {
  applications: number;
  matches: number;
  completedMatches: number;
  participants: Application[];
  schedule: Match[];
  results: unknown[];
  standings: unknown[];
}
export interface Template {
  _id: string;
  key: string;
  version: number;
  subject: string;
  body: string;
  channel: string;
  variables: string[];
  plainText?: boolean;
  event?: string;
  automaticEvent?: { key: string; label: string; recipients: string } | null;
  isActive: boolean;
}
export interface Ban {
  _id: string;
  targetType: 'Account' | 'Club' | 'Individual';
  accountId?: string;
  clubId?: string;
  scope: string;
  reason: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
}
export interface Notice {
  _id: string;
  title: string;
  message: string;
  plainText?: boolean;
  channel: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}
export const refId = (value: { _id: string } | string | null | undefined) =>
  typeof value === 'string' ? value : value?._id || '';
export const gameName = (value: Game | string) => (typeof value === 'string' ? 'Game' : value.name);
