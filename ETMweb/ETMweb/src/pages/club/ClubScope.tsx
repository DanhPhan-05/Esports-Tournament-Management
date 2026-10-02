import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { managementApi } from '../../services/management';
import { QueryError, Spinner } from '../../components/ui';
import { Empty } from '../../components/management';
import type { Club } from '../../types/management';
const ClubContext = createContext<Club | null>(null);
export const useClub = () => useContext(ClubContext)!;
export function ClubScope() {
  const [selected, setSelected] = useState('');
  const query = useQuery({ queryKey: ['cm', 'clubs'], queryFn: managementApi.clubs });
  useEffect(() => {
    if (query.data?.length && !query.data.some((club) => club._id === selected))
      setSelected(query.data[0]._id);
  }, [query.data, selected]);
  if (query.isPending) return <Spinner />;
  if (query.isError)
    return (
      <QueryError
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (!query.data.length)
    return <Empty>Bạn chưa được phân công quản lý CLB. Liên hệ quản trị viên để được cấp quyền.</Empty>;
  const club = query.data.find((c) => c._id === selected) || query.data[0];
  return (
    <ClubContext.Provider value={club}>
      <div className="club-selector">
        <label htmlFor="current-club">CLB đang quản lý</label>
        <select id="current-club" value={club._id} onChange={(e) => setSelected(e.target.value)}>
          {query.data.map((c) => (
            <option value={c._id} key={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div key={club._id}>
        <Outlet />
      </div>
    </ClubContext.Provider>
  );
}
