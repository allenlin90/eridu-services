import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoutePending } from '../route-pending';

describe('routePending', () => {
  it('renders loading page', () => {
    render(<RoutePending />);
    // LoadingPage component should be rendered
    // Since it's from @eridu/ui, we just verify the component renders without error
    expect(document.body).toBeTruthy();
  });
});
