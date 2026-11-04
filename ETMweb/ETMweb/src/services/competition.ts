import { getData, getPage, managementApi } from './management';
import type { Application, Member, Tournament } from '../types/management';
import type {
  ApplicationDetail,
  BracketData,
  ChangeRequest,
  MatchDetail,
  Roster,
} from '../types/competition';
export const competitionApi = {
  application: (id: string) => getData<ApplicationDetail>(`/applications/${id}`),
  roster: (id: string) => getData<Roster>(`/rosters/${id}`),
  rosters: (params: object) => getData<Roster[]>('/rosters', params),
  changes: (id: string) => getData<ChangeRequest[]>(`/rosters/${id}/changes`),
  bracket: (id: string) => getData<BracketData>(`/tournaments/${id}/brackets/manage`),
  match: (id: string) => getData<MatchDetail>(`/matches/${id}`),
  allMembers: async (club: string, team: string): Promise<Member[]> => {
    const first = await managementApi.members(club, { teamId: team, limit: 100 });
    const pages = Math.ceil((first.pagination?.total || 0) / 100);
    const remaining = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        managementApi.members(club, { teamId: team, limit: 100, page: i + 2 }),
      ),
    );
    return [...first.data, ...remaining.flatMap((p) => p.data)];
  },
  openTournaments: async (): Promise<Tournament[]> => {
    const first = await getPage<Tournament>('/tournaments', { status: 'RegistrationOpen', limit: 100 });
    const pages = Math.ceil((first.pagination?.total || 0) / 100);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        getPage<Tournament>('/tournaments', { status: 'RegistrationOpen', limit: 100, page: i + 2 }),
      ),
    );
    return [...first.data, ...rest.flatMap((p) => p.data)];
  },
  clubRosters: async (applications: Application[]) => {
    const groups = await Promise.all(
      applications.map(async (application) => ({
        application,
        rosters: await competitionApi.rosters({ applicationId: application._id }),
      })),
    );
    return groups.flatMap((g) => g.rosters.map((roster) => ({ roster, application: g.application })));
  },
};
