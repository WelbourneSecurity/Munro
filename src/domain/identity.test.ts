import { getProductName } from './identity';

describe('getProductName', () => {
  it('returns the product name', () => {
    expect(getProductName()).toBe('Munro');
  });
});
