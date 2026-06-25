import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@betagouv/france-chaleur-urbaine-publicodes', () => ({
  default: {},
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('renders the simulator homepage', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /Pompe à chaleur air\/eau/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer la simulation' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('starts the journey from the homepage', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la simulation' }));

    expect(window.location.search).toBe('?step=1');
    expect(screen.getByText(/Quel est le type de votre logement/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Maison individuelle')).toBeInTheDocument();
  });

  it('keeps default form values out of the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    expect(window.location.search).toBe('?step=1');
  });

  it('stores answers in the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    fireEvent.click(screen.getByLabelText('Maison individuelle'));

    expect(window.location.search).toContain('housing=house');
    expect(screen.getByText('Type de logement')).toBeInTheDocument();
    expect(screen.getByLabelText('Propriétaire')).toBeInTheDocument();
  });

  it('hides following answers when editing a previous step', () => {
    window.history.replaceState(null, '', '/?step=3&situation=owner&housing=house');

    render(<App />);

    expect(screen.getByText('Statut d’occupation')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[0]);

    expect(window.location.search).toContain('step=1');
    expect(screen.queryByText('Propriétaire')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Maison individuelle')).toBeInTheDocument();
  });

  it('selects a postcode and city from the autocomplete', async () => {
    window.history.replaceState(null, '', '/?step=4&housing=house&situation=owner&equipment=gas-boiler');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const payload = String(input).includes('api-adresse.data.gouv.fr')
          ? {
              features: [
                {
                  geometry: { coordinates: [-1.5586, 43.4832] },
                  properties: {
                    city: 'Biarritz',
                    citycode: '64122',
                    context: '64, Pyrénées-Atlantiques, Nouvelle-Aquitaine',
                    label: 'Biarritz',
                    postcode: '64200',
                  },
                },
              ],
            }
          : [];

        return new Response(JSON.stringify(payload), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }) satisfies typeof fetch
    );

    render(<App />);

    fireEvent.change(screen.getByRole('searchbox', { name: /Code postal/i }), { target: { value: 'Biarritz' } });
    fireEvent.click(await screen.findByRole('button', { name: '64200 Biarritz' }));

    await waitFor(() => expect(window.location.search).toContain('location=64200+Biarritz'));
    const searchParams = new URLSearchParams(window.location.search);

    expect(searchParams.get('postcode')).toBe('64200');
    expect(searchParams.get('departmentCode')).toBe('64');
    expect(screen.getByText('Commune sélectionnée : 64200 Biarritz')).toBeInTheDocument();
  });
});
