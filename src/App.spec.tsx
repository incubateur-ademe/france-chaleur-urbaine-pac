import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const trackSimulateurPacEventMock = vi.hoisted(() => vi.fn());

vi.mock('./tracking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./tracking')>();

  return {
    ...actual,
    trackSimulateurPacEvent: trackSimulateurPacEventMock,
  };
});

import { App } from './App';

afterEach(() => {
  cleanup();
  trackSimulateurPacEventMock.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('App', () => {
  it('renders the simulator homepage', () => {
    render(<App />);

    expect(screen.getByText('Quelques questions sur votre logement pour estimer le coût, les aides et vos économies.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Démarrer la simulation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'France Chaleur Urbaine' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://france-chaleur-urbaine.beta.gouv.fr/comparateur-couts-performances')
    );
    expect(window.location.search).toBe('');
  });

  it('starts the journey from the homepage', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la simulation' }));

    expect(window.location.search).toBe('?step=1');
    expect(trackSimulateurPacEventMock).toHaveBeenCalledWith('simulateur_pac:form_started', expect.objectContaining({ current_step: 0 }));
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

  it('goes back to the previous questionnaire step from the back button', () => {
    window.history.replaceState(null, '', '/?step=3&situation=owner&housing=house');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Question précédente' }));

    expect(window.location.search).toContain('step=2');
    expect(screen.getByLabelText('Une maison individuelle')).toBeInTheDocument();
  });

  it('shows a continue button when going back to an already answered choice step', () => {
    window.history.replaceState(null, '', '/?step=3&situation=owner&housing=house');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Question précédente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(window.location.search).toContain('step=3');
    expect(screen.getByLabelText('Chaudière au gaz')).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: /Optimiser ma consommation avec WattWatchers/i })).toBeInTheDocument();
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
    expect(searchParams.get('citycode')).toBe('64122');
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

  it('shows a single previous action and restart action on the results step', async () => {
    window.history.replaceState(
      null,
      '',
      '/?step=9&situation=owner&housing=house&equipment=gas-boiler&location=64200+Biarritz&city=Biarritz&postcode=64200&citycode=64122&dpe=D&surface=100&occupants=2&incomeCategory=Modeste'
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).includes('tabular-api.data.gouv.fr')) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  'Adresse Structure': '15 avenue de Verdun',
                  'Code Postal Structure': '64100',
                  'Commune Structure': 'BAYONNE',
                  'Email Structure': 'contact@example.fr',
                  'Nom Structure': 'Espace Conseil France Rénov’ Pays Basque',
                  'Site Internet Structure': 'www.example.fr',
                  'Telephone 2 Structure': null,
                  'Telephone Structure': '0559000000',
                },
              ],
            })
          );
        }

        return new Response(
          JSON.stringify({
            gasBoilerAnnualBill: 1800,
            heatingModeComparisons: [
              { co2: 500, label: 'PAC air/eau', p1: 900 },
              { co2: 2500, label: 'Chaudière gaz', p1: 1800 },
              { co2: 3200, label: 'Chaudière fioul', p1: 2200 },
            ],
            heatPumpAnnualBill: 900,
            heatPumpCoupDePouce: 4049,
            heatPumpGrossPrice: 14000,
            heatPumpMaprimerenovAid: 3000.4,
            heatPumpProposedPower: 8,
            oilBoilerAnnualBill: 2200,
          })
        );
      }) satisfies typeof fetch
    );

    render(<App />);

    expect(screen.getAllByRole('button', { name: 'Question précédente' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Recommencer' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Précédent' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Vos résultats')).toBeInTheDocument());
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
    expect(screen.getByRole('heading', { name: 'Vos réponses' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Modifier' })).toHaveLength(8);
    expect(screen.getByText('Propriétaire')).toBeInTheDocument();
    expect(screen.getByText('Classe D')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Trouver un conseiller France Rénov’' })).toHaveLength(2);
    expect(screen.queryByText('Espace Conseil France Rénov’ Pays Basque')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '05 59 00 00 00' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Trouver un conseiller France Rénov’' })[0]);

    expect(trackSimulateurPacEventMock).toHaveBeenCalledWith(
      'simulateur_pac:france_renov_coordinates_requested',
      expect.objectContaining({
        current_step: 9,
      })
    );
    await waitFor(() => expect(screen.getAllByText('Espace Conseil France Rénov’ Pays Basque')).toHaveLength(2));
    expect(screen.getAllByRole('link', { name: '05 59 00 00 00' })).toHaveLength(2);
    expect(screen.getAllByText(/12\s000 à 17\s000 €/)).toHaveLength(2);
    expect(screen.getAllByText(/5\s000 à 10\s000 €/)).toHaveLength(3);
    expect(screen.getByText(/amorti en ≈ 6 à 11 ans/)).toBeInTheDocument();
  });
});
