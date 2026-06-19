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
  it('renders the simulator homepage', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /Évaluez les gains économiques et écologiques/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer ma simulation' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('starts the journey from the homepage', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ma simulation' }));

    expect(window.location.search).toBe('?step=1');
    expect(screen.getByRole('heading', { level: 2, name: /Votre situation/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Propriétaire')).toBeInTheDocument();
  });

  it('keeps default form values out of the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    expect(window.location.search).toBe('?step=1');
  });

  it('stores answers in the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    fireEvent.click(screen.getByLabelText('Propriétaire'));

    expect(window.location.search).toContain('situation=owner');
    expect(screen.getByRole('heading', { level: 2, name: /Votre logement/i })).toBeInTheDocument();
  });
});
