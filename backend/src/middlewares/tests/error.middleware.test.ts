import type { NextFunction, Request, Response } from 'express';
import { errorMiddleware } from '../error.middleware';
import { ApiError } from '../../utils/ApiError';

function makeResponse() {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  return { status, json } as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('errorMiddleware', () => {
  it('no convierte ApiError en Unexpected server error', () => {
    const res = makeResponse();

    errorMiddleware(
      new ApiError(400, 'La foto del DNI es obligatoria.'),
      {} as Request,
      res,
      jest.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'La foto del DNI es obligatoria.'
      })
    );
  });

  it('mantiene mensaje generico para errores inesperados en produccion', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { errorMiddleware: productionErrorMiddleware } = require('../error.middleware') as typeof import('../error.middleware');
    const res = makeResponse();

    productionErrorMiddleware(
      new Error('detalle interno'),
      {} as Request,
      res,
      jest.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Unexpected server error'
      })
    );

    process.env.NODE_ENV = previousNodeEnv;
    jest.resetModules();
  });

  it('mantiene mensaje generico para errores inesperados en desarrollo', () => {
    const res = makeResponse();

    errorMiddleware(
      new Error('storage unavailable con detalle interno'),
      {} as Request,
      res,
      jest.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Unexpected server error'
    });
  });

  it('no expone stack trace en la respuesta', () => {
    const res = makeResponse();

    errorMiddleware(
      new ApiError(404, 'No se encontraron los archivos subidos para esta solicitud.'),
      {} as Request,
      res,
      jest.fn() as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'No se encontraron los archivos subidos para esta solicitud.'
    });
  });
});
