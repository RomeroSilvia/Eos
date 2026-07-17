import type { Request, Response } from 'express';
import { getAuditLogs } from '../audit.controller';
import * as auditService from '../audit.service';

jest.mock('../audit.service', () => ({
  getAuditLogs: jest.fn()
}));

const mockedAuditService = jest.mocked(auditService);

type MockResponse = Pick<Response, 'json'>;

function createMockResponse(): MockResponse {
  const response: Partial<MockResponse> = {};
  response.json = jest.fn().mockReturnValue(response);
  return response as MockResponse;
}

function createRequest(query: Record<string, unknown> = {}): Request {
  return { query } as unknown as Request;
}

describe('auditController.getAuditLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuditService.getAuditLogs.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('pasa los query params como strings al service', async () => {
    const req = createRequest({
      entity: 'center',
      entityId: 'center-1',
      actorId: 'admin-1',
      from: '2026-07-01',
      to: '2026-07-17',
      page: '2',
      limit: '10'
    });
    const res = createMockResponse();

    await getAuditLogs(req, res as Response, jest.fn());

    expect(mockedAuditService.getAuditLogs).toHaveBeenCalledWith({
      entity: 'center',
      entityId: 'center-1',
      actorId: 'admin-1',
      from: '2026-07-01',
      to: '2026-07-17',
      page: '2',
      limit: '10'
    });
    expect(res.json).toHaveBeenCalledWith({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('ignora query params vacíos o no-string', async () => {
    const req = createRequest({ entity: '', actorId: ['a', 'b'] });
    const res = createMockResponse();

    await getAuditLogs(req, res as Response, jest.fn());

    expect(mockedAuditService.getAuditLogs).toHaveBeenCalledWith({
      entity: undefined,
      entityId: undefined,
      actorId: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      limit: undefined
    });
  });
});
