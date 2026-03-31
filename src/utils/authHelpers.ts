import type { User } from '../types/auth';

const STORAGE_PREFIX = '/storage/';

const getApiOrigin = (): string => {
    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (!apiBase) return '';

    try {
        return new URL(apiBase).origin;
    } catch {
        return '';
    }
};

export const resolveStorageUrl = (value?: string | null): string | null => {
    if (!value) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    if (raw.startsWith('data:') || raw.startsWith('blob:')) {
        return raw;
    }

    const apiOrigin = getApiOrigin();

    if (/^(https?:)?\/\//i.test(raw)) {
        if (!apiOrigin) return raw;

        try {
            const parsed = new URL(raw);
            const normalizedPath = parsed.pathname.replace(/\/{2,}/g, '/');
            if (normalizedPath.startsWith(STORAGE_PREFIX) || normalizedPath.startsWith('storage/')) {
                const finalPath = normalizedPath.startsWith('/')
                    ? normalizedPath
                    : `/${normalizedPath}`;
                return `${apiOrigin}${finalPath}${parsed.search || ''}${parsed.hash || ''}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }

    if (!apiOrigin) return raw;

    if (raw.startsWith(STORAGE_PREFIX)) {
        return `${apiOrigin}${raw}`;
    }

    const normalized = raw.replace(/^\/+/, '');
    if (normalized.startsWith('storage/')) {
        return `${apiOrigin}/${normalized}`;
    }

    return `${apiOrigin}${STORAGE_PREFIX}${normalized}`;
};

// Función para verificar si un usuario tiene un permiso específico
export const userHasPermission = (user: User | null, permission: string): boolean => {
    if (!user || !user.role) return false;

    return user.role.some(role =>
        role.permissions.some(p => p.name === permission)
    );
};

// Función para verificar si un usuario tiene un rol específico
export const userHasRole = (user: User | null, roleName: string): boolean => {
    if (!user || !user.role) return false;

    return user.role.some(role => role.name === roleName);
};

// Función para obtener todos los permisos de un usuario
export const getUserPermissions = (user: User | null): string[] => {
    if (!user || !user.role) return [];

    const permissions = user.role.flatMap(role =>
        role.permissions.map(permission => permission.name)
    );

    // Eliminar duplicados
    return [...new Set(permissions)];
};

// Función para obtener los nombres de los roles de un usuario
export const getUserRoles = (user: User | null): string[] => {
    if (!user || !user.role) return [];

    return user.role.map(role => role.name);
};

// Función para formatear el nombre completo del usuario
export const getDisplayName = (user: User | null): string => {
    if (!user) return 'Usuario';
    return user.name || 'Usuario Sin Nombre';
};

// Función para obtener el avatar del usuario o uno por defecto
export const getUserAvatar = (user: User | null): string => {
    if (!user) return '/assets/default-avatar.png';

    const resolvedAvatar =
        resolveStorageUrl(user.avatar) ||
        resolveStorageUrl(user.avatar_url);

    return resolvedAvatar || '/assets/default-avatar.png';
};

// Función para verificar si la cuenta está activa
export const isAccountActive = (user: User | null): boolean => {
    if (!user) return false;
    return user.status === 'active';
};

// Función para verificar si el email está verificado
export const isEmailVerified = (user: User | null): boolean => {
    if (!user) return false;
    return !!user.email_verified_at;
};
