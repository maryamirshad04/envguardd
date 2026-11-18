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
    const images = screen.getAllByRole('img', { hidden: true }); 
    expect(images.length).toBeGreaterThan(0);
  });
});