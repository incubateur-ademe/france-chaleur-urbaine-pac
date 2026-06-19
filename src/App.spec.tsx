import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@betagouv/france-chaleur-urbaine-publicodes', () => ({
  default: {},
}));

describe('App', () => {
  it('renders the heating simulation form', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Comparateur PAC' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculer' })).toBeInTheDocument();
  });
});
