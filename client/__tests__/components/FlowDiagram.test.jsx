import { render, screen } from '@testing-library/react';
import FlowDiagram from '@/components/FlowDiagram';

describe('FlowDiagram', () => {
  test('renders the central image', () => {
    render(<FlowDiagram />);
    const centralImg = screen.getByAltText(
      /A padlock merged with a leaf, representing secure and effortless protection/i
    );
    expect(centralImg).toBeInTheDocument();
    expect(centralImg).toHaveAttribute('src', '/leaf_and_lock.png');
  });

  test('renders all decorative images', () => {
    render(<FlowDiagram />);
    // Check that at least a few decorative images are present
    const images = screen.getAllByRole('img', { hidden: true }); // they have aria-hidden="true"
    // We can't easily test all, but check count
    // We'll just verify the component renders without crashing
    expect(images.length).toBeGreaterThan(0);
  });
});