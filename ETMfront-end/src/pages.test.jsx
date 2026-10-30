import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './pages/index.jsx';

describe('home page', () => {
  it('links to the three Epic modules', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Khám phá giải đấu/i }).getAttribute('href')).toBe('/tournaments');
    expect(screen.getByRole('link', { name: /Tìm câu lạc bộ/i }).getAttribute('href')).toBe('/clubs');
    expect(screen.getByRole('link', { name: /Tạo tài khoản miễn phí/i }).getAttribute('href')).toBe('/register');
  });
});
