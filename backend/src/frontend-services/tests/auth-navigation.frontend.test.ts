import {
  getAuthGuardRedirect,
  getHomeRouteForRole,
  getStandalonePrivateAllowedRoles,
  isStandalonePrivateSegment
} from '@/services/authNavigation';
import type { UserRole } from '@/types/user';

describe('auth navigation guards', () => {
  it('no redirige mientras esta cargando', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: false,
      isLoading: true,
      role: null
    })).toBeNull();
  });

  it('redirige al login si una ruta privada no tiene sesion', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: false,
      isLoading: false,
      role: null
    })).toBe('/(auth)/login');
  });

  it('impide que un usuario autenticado permanezca en login', () => {
    expect(getAuthGuardRedirect({
      hasSession: true,
      isAuthRoute: true,
      isLoading: false,
      role: 'user'
    })).toBe('/(tabs)/home');
  });

  it('permite a un usuario normal acceder a tabs normales', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: true,
      isLoading: false,
      role: 'user'
    })).toBeNull();
  });

  it('redirige al login si todavia no hay rol validado para una ruta privada', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: true,
      isLoading: false,
      role: null
    })).toBe('/(auth)/login');
  });

  it('redirige especialistas a su shell correcto', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: true,
      isLoading: false,
      role: 'specialist'
    })).toBe('/(tabs-specialist)');
  });

  it('redirige center_admin a tabs-admin', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: true,
      isLoading: false,
      role: 'center_admin'
    })).toBe('/(tabs-admin)');
  });

  it('redirige roles desconocidos a login en rutas privadas', () => {
    expect(getAuthGuardRedirect({
      allowedRoles: ['user'],
      hasSession: true,
      isLoading: false,
      role: 'rol-raro'
    })).toBe('/(auth)/login');
  });

  it('no genera loop en auth si el rol autenticado es desconocido', () => {
    expect(getAuthGuardRedirect({
      hasSession: true,
      isAuthRoute: true,
      isLoading: false,
      role: 'rol-raro'
    })).toBeNull();
  });

  it('mantiene una decision estable para evitar loops', () => {
    const input = {
      allowedRoles: ['user'] as UserRole[],
      hasSession: true,
      isLoading: false,
      role: 'specialist' as UserRole
    };

    expect(getAuthGuardRedirect(input)).toBe(getAuthGuardRedirect(input));
  });

  it('devuelve rutas home validas para los roles reales', () => {
    expect(getHomeRouteForRole('user')).toBe('/(tabs)/home');
    expect(getHomeRouteForRole('specialist')).toBe('/(tabs-specialist)');
    expect(getHomeRouteForRole('center_admin')).toBe('/(tabs-admin)');
  });

  it('protege deep links privados de raiz', () => {
    [
      'chat',
      'notifications',
      'patients',
      'products',
      'progress',
      'quiz',
      'quiz-results',
      'resultados',
      'routine',
      'settings',
      'specialist-status',
      'specialists'
    ].forEach((segment) => {
      expect(isStandalonePrivateSegment(segment)).toBe(true);
    });
  });

  it('mantiene publicas las rutas de entrada y autenticacion', () => {
    ['index', 'landing', 'start-diagnosis', 'start-quiz', '(auth)', '(tabs)', '(tabs-admin)', '(tabs-specialist)']
      .forEach((segment) => {
        expect(isStandalonePrivateSegment(segment)).toBe(false);
      });
  });

  it('restringe specialist-status solo a especialistas', () => {
    expect(getStandalonePrivateAllowedRoles('specialist-status')).toEqual(['specialist']);
    expect(getStandalonePrivateAllowedRoles('settings')).toBeUndefined();
  });
});
