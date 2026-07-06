import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

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
    expect(screen.getByRole('link', { name: 'Partager par email' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:?subject=Simulation%20pompe%20%C3%A0%20chaleur%20air%2Feau')
    );
    expect(screen.getByRole('button', { name: 'Copier dans le presse-papier' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('starts the journey from the homepage', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la simulation' }));

    expect(window.location.search).toBe('?step=1');
    expect(screen.getByText(/Êtes-vous propriétaire/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Je suis propriétaire')).toBeInTheDocument();
  });

  it('keeps default form values out of the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    expect(window.location.search).toBe('?step=1');
  });

  it('stores answers in the URL', () => {
    window.history.replaceState(null, '', '/?step=1');

    render(<App />);

    fireEvent.click(screen.getByLabelText('Je suis propriétaire'));

    expect(window.location.search).toContain('situation=owner');
    expect(screen.getByText('Statut d’occupation')).toBeInTheDocument();
    expect(screen.getByLabelText('Une maison individuelle')).toBeInTheDocument();
  });

  it('goes back to the previous questionnaire step from the header button', () => {
    window.history.replaceState(null, '', '/?step=3&situation=owner&housing=house');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(window.location.search).toContain('step=2');
    expect(screen.getByLabelText('Une maison individuelle')).toBeInTheDocument();
  });

  it('shows an inline recommendation and stops the journey for electric radiators', () => {
    window.history.replaceState(null, '', '/?step=3&housing=house&situation=owner');
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    render(<App />);

    fireEvent.click(screen.getByLabelText('Radiateur électrique'));

    expect(window.location.search).toContain('step=3');
    expect(
      screen.getByText('Malheureusement, l’installation d’une PAC air/eau n’est pas recommandée dans votre maison.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aller sur .*Watt Watchers/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuer' })).not.toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('shows the heated surface before the occupant count', () => {
    window.history.replaceState(
      null,
      '',
      '/?step=6&situation=owner&housing=house&equipment=gas-boiler&location=64200+Biarritz&city=Biarritz&postcode=64200&dpe=D'
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }) satisfies typeof fetch
    );

    render(<App />);

    expect(screen.getByText('Surface chauffée - QUESTION 6/8')).toBeInTheDocument();
    expect(screen.getByLabelText('Quelle est la surface chauffée du logement ?')).toBeInTheDocument();
    expect(screen.getByText(/Étape suivante :/).parentElement).toHaveTextContent('Composition du foyer');
  });

  it('hides following answers when editing a previous step', () => {
    window.history.replaceState(null, '', '/?step=3&situation=owner&housing=house');

    render(<App />);

    expect(screen.getByText('Type de logement')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[0]);

    expect(window.location.search).toContain('step=1');
    expect(screen.queryByText('Maison individuelle')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Je suis propriétaire')).toBeInTheDocument();
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
    expect(searchParams.get('departmentCode')).toBeNull();
    expect(screen.getByText('Commune sélectionnée : 64200 Biarritz')).toBeInTheDocument();
  });

  it('scrolls down when the final result action appears', async () => {
    window.history.replaceState(
      null,
      '',
      '/?step=8&situation=owner&housing=house&equipment=gas-boiler&location=64200+Biarritz&city=Biarritz&postcode=64200&dpe=D&surface=100&occupants=2'
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }) satisfies typeof fetch
    );

    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: /^Modeste\b/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Voir mes résultats' })).toBeInTheDocument());
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
