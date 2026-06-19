import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@betagouv/france-chaleur-urbaine-publicodes', () => ({
  default: {},
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('renders the first journey step', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Estimez votre projet de pompe à chaleur' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Votre situation/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Propriétaire')).toBeInTheDocument();
  });

  it('stores answers in the URL', () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText('Propriétaire'));

    expect(window.location.search).toContain('situation=owner');
    expect(screen.getByRole('heading', { level: 2, name: /Votre logement/i })).toBeInTheDocument();
  });
});
