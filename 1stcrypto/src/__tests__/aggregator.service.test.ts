// aggregator.service.test.ts
jest.setTimeout(15000);

import { AggregatorService } from '../services/aggregator.service';

describe('AggregatorService', () => {
  const aggregatorService = new AggregatorService();

  it('should return an array of tokens', async () => {
    const result = await aggregatorService.aggregateTokens();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle provider failure gracefully', async () => {
    jest
      .spyOn(aggregatorService['providers'][0], 'fetchTokens')
      .mockRejectedValueOnce(new Error('Mocked provider failure'));
    const result = await aggregatorService.aggregateTokens();
    expect(Array.isArray(result)).toBe(true);
  });
});