import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ArrowUpRight, Pencil } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  Avatar,
  Badge,
  Button,
  PageHeading,
  Pagination,
  QueryError,
  Spinner,
  Table,
} from '../../components/ui';
import { formatDate, roleNames, roles, statuses, statusNames } from '../../utils/account';
import { AccountForm } from './AccountForms';
import type { Account } from '../../types';

export function AccountsPage() {
  const [search, setSearch] = useSearchParams();
  const email = search.get('email') || '';
  const debounced = useDebouncedValue(email);
  const [editing, setEditing] = useState<Account | 'create' | null>(null);
  const role = search.get('role') || '';
  const status = search.get('status') || '';
  const page = Math.max(1, Number(search.get('page')) || 1);
  const limit = 10;
  function filter(key: string, value: string) {
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: key === 'email' },
    );
  }
  const query = useQuery({
    queryKey: ['admin', 'accounts', debounced, role, status, page],
    queryFn: () =>
      adminApi.accounts({
        email: debounced.trim() || undefined,
        role: role || undefined,
        status: status || undefined,
        page,
        limit,
      }),
  });
  return (
    <>
      <PageHeading
        eyebrow="ACCESS MANAGEMENT"
        title="Quản lý tài khoản"
        description="Tra cứu và quản lý quyền truy cập trong hệ thống."
        action={
          <Button onClick={() => setEditing('create')}>
            <Plus size={18} /> Tạo nhân sự
          </Button>
        }
      />
      <section className="panel table-panel">
        <div className="filters">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Tìm theo email"
              placeholder="Tìm kiếm theo email…"
              value={email}
              onChange={(e) => filter('email', e.target.value)}
            />
          </div>
          <select aria-label="Lọc vai trò" value={role} onChange={(e) => filter('role', e.target.value)}>
            <option value="">Tất cả vai trò</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleNames[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => filter('status', e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusNames[value]}
              </option>
            ))}
          </select>
        </div>
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <QueryError
            message={query.error.message}
            retry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((account) => (
                  <tr key={account._id}>
                    <td>
                      <Link className="account-cell" to={`/admin/accounts/${account._id}`}>
                        <Avatar name={account.fullName} url={account.avatarUrl} />
                        <span>
                          {account.fullName}
                          <small>{account.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{roleNames[account.systemRole]}</td>
                    <td>
                      <Badge status={account.status} />
                    </td>
                    <td>{formatDate(account.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Chỉnh sửa ${account.email}`}
                          onClick={() => setEditing(account)}
                        >
                          <Pencil size={16} />
                        </button>
                        <Link
                          className="icon-button"
                          aria-label={`Xem ${account.email}`}
                          to={`/admin/accounts/${account._id}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!query.data.data.length && (
              <div className="empty">
                <Search size={30} />
                <h3>Không tìm thấy tài khoản</h3>
                <p className="muted">Thử thay đổi từ khóa hoặc bộ lọc.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch({});
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
            <Pagination
              page={page}
              limit={limit}
              total={query.data.pagination?.total || 0}
              onChange={(p) => filter('page', String(p))}
            />
          </>
        )}
      </section>
      {editing && (
        <AccountForm account={editing === 'create' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
