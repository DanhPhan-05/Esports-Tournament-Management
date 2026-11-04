import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui';
export function GlobalSearch() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const form = (
    <form
      className="global-search-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <input
        aria-label="Tìm kiếm toàn hệ thống"
        placeholder="Tìm giải đấu, CLB…"
        value={value}
        maxLength={100}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" aria-label="Tìm kiếm">
        ⌕
      </button>
    </form>
  );
  return (
    <div className="global-search">
      <div className="desktop-search">{form}</div>
      <button className="icon-button mobile-search" aria-label="Mở tìm kiếm" onClick={() => setOpen(true)}>
        ⌕
      </button>
      {open && (
        <Modal title="Tìm kiếm toàn hệ thống" onClose={() => setOpen(false)}>
          {form}
        </Modal>
      )}
    </div>
  );
}
