import { api } from './api';
import type { ApiResponse } from '../types';
import type {
  Application,
  Ban,
  Club,
  Game,
  Member,
  Notice,
  Team,
  Template,
  Tournament,
  TournamentReport,
} from '../types/management';
export const getData = <T>(url: string, params?: object) =>
  api.get<ApiResponse<T>>(url, { params }).then((r) => r.data.data);
export const getPage = <T>(url: string, params?: object) =>
  api.get<ApiResponse<T[]>>(url, { params }).then((r) => r.data);
export const save = <T>(url: string, body: object, method: 'post' | 'put' | 'patch' = 'post') =>
  api[method]<ApiResponse<T> & { warning?: string }>(url, body).then((r) => r.data);
export const managementApi = {
  tournamentRegions: () => getData<string[]>('/tournaments/regions'),
  games: () => getData<Game[]>('/games'),
  clubs: () => getData<Club[]>('/clubs/my'),
  teams: (club: string) => getData<Team[]>(`/clubs/${club}/teams`),
  members: (club: string, params?: object) => getPage<Member>(`/clubs/${club}/members`, params),
  applications: () => getData<Application[]>('/applications/my'),
  tournaments: () => getData<Tournament[]>('/tournaments/my'),
  tournament: async (id: string): Promise<Tournament> => {
    // The detail endpoint returns a game ID; the owned list resolves its display
    // information even when that game has been deactivated in the catalogue.
    const [detail, owned] = await Promise.all([
      getData<Tournament>(`/tournaments/manage/${id}`),
      getData<Tournament[]>('/tournaments/my'),
    ]);
    return { ...detail, gameId: owned.find((item) => item._id === id)?.gameId || detail.gameId };
  },
  tournamentApplications: (id: string) => getData<Application[]>(`/tournaments/${id}/applications`),
  report: (id: string) => getData<TournamentReport>(`/tournaments/${id}/reports`),
  adminClubs: () => getData<Club[]>('/admin/clubs'),
  adminGames: () => getData<Game[]>('/admin/games'),
  templates: () => getData<Template[]>('/admin/notifications'),
  bans: (params?: object) => getPage<Ban>('/admin/bans', params),
  notices: (params?: object) =>
    api
      .get<ApiResponse<Notice[]> & { unread: number }>('/notifications', {
        params: { channel: 'InApp', ...params },
      })
      .then((r) => r.data),
  upload: async (
    file: File,
    scope = 'document',
    clubId?: string,
    context?: { entityId?: string; assetName?: string },
  ) => {
    const body = new FormData();
    body.append('file', file);
    const params = new URLSearchParams({ scope });
    if (clubId) params.set('clubId', clubId);
    if (context?.entityId) params.set('entityId', context.entityId);
    if (context?.assetName) params.set('assetName', context.assetName.slice(0, 200));
    return api
      .post<ApiResponse<{ url: string }>>(`/uploads?${params}`, body, { timeout: 180000 })
      .then((r) => r.data.data.url);
  },
};
