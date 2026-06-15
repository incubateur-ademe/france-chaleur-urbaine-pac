import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the IFPEN heating simulation form', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dimensionnement PAC air/eau' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculer' })).toBeInTheDocument();
  });
});
