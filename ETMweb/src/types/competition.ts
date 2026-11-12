import type { Application, Match, Member, Team, Tournament } from './management';
export interface Entry {
  clubMemberId: Member | string | null;
  role: string;
  inGameName?: string;
}
export interface Roster {
  _id: string;
  applicationId: string;
  tournamentId: string;
  teamId: string;
  entries: Entry[];
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
}
export interface ApplicationRecord extends Application {
  note?: string;
  documents: string[];
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  updatedAt?: string;
  tournamentId: Tournament;
  teamId: Team;
}
export interface ApplicationDetail {
  application: ApplicationRecord;
  roster: Roster | null;
}
export interface ChangeRequest {
  _id: string;
  rosterId: string;
  addMemberIds: (Member | string)[];
  removeMemberIds: (Member | string)[];
  reason: string;
  status: string;
  reviewNote?: string;
  createdAt: string;
}
export interface Bracket {
  _id: string;
  status: string;
  seeds: { teamId: string; seed: number }[];
  type: string;
  predictionEnabled: boolean;
  predictionOpenAt?: string;
  predictionLockAt?: string;
}
export interface Fixture extends Omit<Match, 'teamAId' | 'teamBId'> {
  nextMatchId?: string | null;
  nextMatchSlot?: 'TeamA' | 'TeamB' | null;
  loserNextMatchId?: string | null;
  loserNextMatchSlot?: 'TeamA' | 'TeamB' | null;
  teamAId: Team | string | null;
  teamBId: Team | string | null;
  tournamentId: string;
  bracketId: string;
  section: string;
  bestOf: number;
  venue?: string;
  streamUrl?: string;
  referee?: string;
  isBye: boolean;
  enabled: boolean;
  postponeReason?: string;
}
export interface Result {
  _id: string;
  teamAScore: number;
  teamBScore: number;
  status: string;
  isForfeit: boolean;
  revision: number;
  statistics?: Record<string, unknown>;
  games?: { game: number; teamAScore: number; teamBScore: number }[];
  evidenceUrls: string[];
  correctionReason?: string;
}
export interface ScoreAudit {
  _id: string;
  actorId: { fullName: string } | null;
  previousScore?: { teamAScore: number; teamBScore: number };
  newScore: { teamAScore: number; teamBScore: number };
  action: string;
  reason?: string;
  createdAt: string;
  resultRevision: number;
}
export interface MatchDetail {
  match: Fixture;
  result: Result | null;
  audit: ScoreAudit[];
}
export interface BracketData {
  bracket: Bracket;
  matches: Fixture[];
}
