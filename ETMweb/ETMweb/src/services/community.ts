import { getData, getPage } from './management';
import type {
  Article,
  LeaderRow,
  PickemEvent,
  PolicyData,
  Prediction,
  Protest,
  ProtestCandidate,
  PublicClub,
  PublicFixture,
  PublicStanding,
  PublicTournament,
  Violation,
} from '../types/community';
import type { Tournament } from '../types/management';
export const communityApi = {
  tournaments: (params?: object) => getPage<Tournament>('/tournaments', params),
  tournament: (id: string) => getData<PublicTournament>(`/tournaments/${id}`),
  matches: (id: string) => getData<PublicFixture[]>(`/tournaments/${id}/matches`),
  publicMatch: (id: string) =>
    getData<{
      match: PublicFixture;
      tournament: { _id: string; name: string };
      result: PublicFixture['result'];
    }>(`/public/matches/${id}`),
  clubs: (params?: object) => getPage<PublicClub>('/clubs', params),
  club: (id: string) => getData<PublicClub>(`/clubs/${id}`),
  news: (params?: object) => getPage<Article>('/news', params),
  article: (slug: string) => getData<Article>(`/news/${slug}`),
  standings: (params?: object) => getPage<PublicStanding>('/standings', params),
  events: () => getData<PickemEvent[]>('/predictions/events', { view: 'all' }),
  history: (page: number) => getPage<Prediction>('/predictions/me', { page, limit: 10 }),
  leaderboard: () => getData<LeaderRow[]>('/predictions/leaderboard'),
  protests: (organizer: boolean, params?: object) =>
    getPage<Protest>(organizer ? '/protests' : '/protests/my', params),
  protest: (id: string) => getData<Protest>(`/protests/${id}`),
  eligible: (clubId: string) => getData<ProtestCandidate[]>('/protests/eligible', { clubId }),
  content: (params?: object) => getPage<Article>('/admin/content', params),
  contentDetail: (id: string) => getData<Article>(`/admin/content/${id}`),
  reports: (params?: object) => getPage<Violation>('/admin/reports', params),
  ownReport: (id: string) => getData<Violation>(`/reports/${id}`),
  policies: () => getData<PolicyData>('/admin/security-policies'),
};
