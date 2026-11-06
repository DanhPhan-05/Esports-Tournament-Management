import type { Club, Member, Team, Tournament } from './management';
import type { Fixture, Result } from './competition';
export interface Article {
  _id: string;
  title: string;
  slug: string;
  type: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  status?: string;
  publishedAt?: string;
}
export interface PublicStanding {
  _id: string;
  teamId: Team | null;
  tournamentId: Tournament | null;
  rank?: number;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
}
export interface PublicFixture extends Fixture {
  result: Result | null;
}
export interface PublicTournament extends Tournament {
  teams: Team[];
  bracket: { _id: string } | null;
}
export interface PublicClub extends Club {
  teams: Team[];
  members: Pick<Member, '_id' | 'inGameName' | 'teamId' | 'teamRole'>[];
  standings: PublicStanding[];
  matches: (PublicFixture & { tournamentId: Tournament })[];
}
export interface Prediction {
  _id: string;
  matchId: PublicFixture | null;
  tournamentId: Pick<Tournament, '_id' | 'name' | 'slug'>;
  predictedTeam1Id: Team | null;
  predictedTeam2Id: Team | null;
  predictedWinnerTeamId: Team | null;
  actualWinnerTeamId?: Team | null;
  predictedTeam1Score: number;
  predictedTeam2Score: number;
  status: string;
  pointsAwarded: number;
  isCorrect?: boolean;
  actualResult?: Result | null;
}
export interface PredictionMatch extends Fixture {
  event: {
    lockAt: string;
    opensAt: string;
    status: string;
    scoring?: { winnerPoints: number; exactScorePoints: number };
  } | null;
  canPredict: boolean;
  result?: Result | null;
  availableParticipants: { teamAId: string | Team | null; teamBId: string | Team | null };
  myPrediction: Prediction | null;
}
export interface PickemEvent {
  _id: string;
  tournamentId: Pick<
    Tournament,
    '_id' | 'name' | 'slug' | 'bannerUrl' | 'startAt' | 'endAt' | 'status' | 'gameId' | 'tournamentType'
  >;
  matches: PredictionMatch[];
  predictionWindow: { opensAt: string; locksAt: string };
  summary: { total: number; picked: number; points: number };
}
export interface LeaderRow {
  rank: number;
  userId: string;
  fullName: string;
  points: number;
  correctPredictions: number;
  totalPredictions: number;
  avatarUrl?: string;
}
export interface Protest {
  _id: string;
  clubId: Pick<Club, '_id' | 'name'>;
  tournamentId: Pick<Tournament, '_id' | 'name'>;
  matchId: Fixture;
  category: string;
  description: string;
  evidenceUrls: string[];
  deadline: string;
  status: string;
  decision?: string;
  explanation?: string;
  timeline: {
    _id: string;
    action: string;
    note?: string;
    actorId?: { fullName: string } | null;
    at: string;
  }[];
}
export interface ProtestCandidate {
  match: Omit<Fixture, 'tournamentId'> & { tournamentId: Tournament };
  result: Result;
  deadline: string;
}
export interface Violation {
  _id: string;
  targetType: string;
  targetId:
    | string
    | {
        _id: string;
        round: number;
        position: number;
        tournamentId: { _id: string; name: string } | null;
        teamAId: { name: string } | null;
        teamBId: { name: string } | null;
      }
    | null;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: string;
  resolution?: string;
  createdAt: string;
  reporterId?: { fullName: string; email: string };
}
export interface PolicyData {
  current: Record<string, Record<string, number>>;
  history: {
    _id: string;
    category: string;
    version: number;
    config: Record<string, number>;
    changeReason: string;
    createdAt: string;
  }[];
}
