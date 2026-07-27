import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer', () => {
  test('renders footer text and logo', () => {
    render(<Footer />);
    expect(screen.getByText('envguard')).toBeInTheDocument();
    expect(screen.getByText(/Built for teams who are done pasting secrets into Slack/i)).toBeInTheDocument();
    expect(screen.getByAltText('Envguard icon')).toBeInTheDocument();
  });
});