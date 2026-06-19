import type { NextFunction, Request, Response } from 'express';
import { requireRole } from '../requireRole.middleware';
import { ApiError } from '../../utils/ApiError';

function makeRequest(user?: { id: string; role: string; accessToken: string }): Request {
  return { user } as Request;
}

describe('requireRole', () => {
  it('permite continuar cuando el rol coincide', () => {
    const middleware = requireRole('specialist');
    const next = jest.fn() as NextFunction;

    middleware(makeRequest({ id: 'user-1', role: 'specialist', accessToken: 'token-1' }), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rechaza con 403 cuando el rol no coincide', () => {
    const middleware = requireRole('specialist');

    expect(() => {
      middleware(makeRequest({ id: 'user-1', role: 'user', accessToken: 'token-1' }), {} as Response, jest.fn());
    }).toThrow(ApiError);

    expect(() => {
      middleware(makeRequest({ id: 'user-1', role: 'user', accessToken: 'token-1' }), {} as Response, jest.fn());
    }).toThrow('No tenés permiso para acceder a este recurso.');
  });

  it('rechaza con 403 cuando no hay usuario autenticado', () => {
    const middleware = requireRole('specialist');

    expect(() => {
      middleware(makeRequest(), {} as Response, jest.fn());
    }).toThrow(ApiError);

    expect(() => {
      middleware(makeRequest(), {} as Response, jest.fn());
    }).toThrow('No tenés permiso para acceder a este recurso.');
  });

  it('rechaza con 403 cuando un user intenta acceder a recurso de center_admin', () => {
    const middleware = requireRole('center_admin');

    expect(() => {
      middleware(makeRequest({ id: 'user-1', role: 'user', accessToken: 'token-1' }), {} as Response, jest.fn());
    }).toThrow('No tenés permiso para acceder a este recurso.');
  });

  it('rechaza con 403 cuando un specialist intenta acceder a recurso de center_admin', () => {
    const middleware = requireRole('center_admin');

    expect(() => {
      middleware(makeRequest({ id: 'user-1', role: 'specialist', accessToken: 'token-1' }), {} as Response, jest.fn());
    }).toThrow('No tenés permiso para acceder a este recurso.');
  });
});
