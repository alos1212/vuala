import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BiGroup, BiCode, BiBell, BiLogOut, BiChevronDown, BiBuilding, BiTask, BiUser } from 'react-icons/bi';
import { FaHome, FaCog, FaBars } from "react-icons/fa";
import PermissionGuard from '../auth/PermissionGuard';
import { useAuth } from '../../hooks/useAuth';
import { getUserAvatar, getDisplayName } from '../../utils/authHelpers';
import GlobalTrmBadge from './GlobalTrmBadge';

const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [openMenuByLevel, setOpenMenuByLevel] = useState<Record<number, string>>({});
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAgencyProfile = Boolean(
        user?.agency_id ||
        (Array.isArray(user?.role) && user?.role.some((role) => role?.type === 1))
    );

    const toggleMenu = (key: string, level: number) => {
        setOpenMenuByLevel((prev) => {
            const isOpen = prev[level] === key;
            const next: Record<number, string> = {};
            Object.keys(prev).forEach((entry) => {
                const entryLevel = Number(entry);
                if (entryLevel < level) {
                    next[entryLevel] = prev[entryLevel];
                }
            });
            if (!isOpen) {
                next[level] = key;
            }
            return next;
        });
    };

    const menuItems = [
        {
            name: 'Home',
            icon: FaHome,
            path: '/dashboard',
            permission: 'dashboard.admin'
        },
        {
            name: 'Mi Agencia',
            icon: BiBuilding,
            path: '/my-agency',
            visible: isAgencyProfile,
            permission: 'my-agency.read',
        },
        {
            name: 'Agencias',
            icon: BiGroup,
            path: '/agencies',
            permission: 'agencies.list'
        },
        {
            name: 'CRM',
            icon: BiTask,
            path: '#',
            permission: 'agency-crm.activities.list',
            submenu: [
                { name: 'Resumen CRM', path: '/crm', permission: 'agency-crm.activities.list', exact: true },
                { name: 'Gestiones', path: '/crm/gestiones', permission: 'agency-crm.activities.list', exact: true },
            ]
        },
        {
            name: 'Configuración',
            icon: FaCog,
            path: '#',
            permission: 'settings.read',
            submenu: [
                {
                    name: 'Gestión de Accesos',
                    path: '#',
                    permission: 'access.management',
                    submenu: [
                        { name: 'Roles', icon: BiGroup, path: '/roles', permission: 'roles.list' },
                        { name: 'Permisos', icon: BiCode, path: '/permissions', permission: 'permissions.list' },
                        { name: 'Agencias', icon: BiGroup, path: '/agencies', permission: 'agencies.list' },
                    ]
                },
                {
                    name: 'Usuarios',
                    icon: BiUser,
                    path: '/users',
                    permission: 'users.list',
                },
            ]
        },
    ];

    const renderMenuItems = (items: any[], level = 0, isMobile = false) => (
        <ul className={`app-accordion-list ${level > 0 ? "app-accordion-children" : ""}`}>
            {items.map((item) => {
                if (item.visible === false) return null;

                const isOpen = openMenuByLevel[level] === item.name;
                const sizeClass = level > 0 ? "btn-sm" : "btn-md";
                const baseItemClass = `app-accordion-item btn btn-ghost w-full justify-start text-left gap-3 ${sizeClass} ${isMobile ? "app-accordion-item--mobile" : ""}`;

                const itemContent = (
                    <li className="w-full">
                        {item.submenu ? (
                            <>
                                <button
                                    type="button"
                                    className={`${baseItemClass} app-accordion-toggle ${isOpen ? "app-accordion-open" : ""}`}
                                    onClick={() => toggleMenu(item.name, level)}
                                    aria-expanded={isOpen}
                                >
                                    {item.icon && <item.icon className="w-5 h-5" />}
                                    <span className="app-accordion-label">{item.name}</span>
                                    <BiChevronDown className={`app-accordion-chevron ${isOpen ? "is-open" : ""}`} />
                                </button>
                                {isOpen && renderMenuItems(item.submenu, level + 1, isMobile)}
                            </>
                        ) : (
                            <NavLink
                                to={item.path}
                                end={Boolean(item.exact)}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => {
                                    return `${baseItemClass} ${isActive ? "active" : ""}`;
                                }}
                            >
                                {item.icon && <item.icon className="w-5 h-5" />}
                                <span className="app-accordion-label">{item.name}</span>
                            </NavLink>
                        )}
                    </li>
                );

                if (!item.permission) {
                    return <React.Fragment key={item.name}>{itemContent}</React.Fragment>;
                }

                return (
                    <PermissionGuard key={item.name} permission={item.permission}>
                        {itemContent}
                    </PermissionGuard>
                );
            })}
        </ul>
    );

    const handleProfileClick = () => {
        setIsOpen(false);
        navigate('/profile');
    };

    const handleLogoutClick = () => {
        setIsOpen(false);
        logout();
    };

    const renderProfileButton = () => (
        <button
            type="button"
            className="btn btn-ghost flex w-full items-center justify-start space-x-2 px-2"
            onClick={handleProfileClick}
        >
            <div className="avatar">
                <div className="w-8 rounded-full avatar">
                    <img src={getUserAvatar(user)} alt={getDisplayName(user)} />
                </div>
            </div>
            <div className="text-left">
                <div className="text-sm font-semibold">{getDisplayName(user)}</div>
                <div className="text-xs text-base-content/60">
                    {user?.role?.[0]?.display_name || 'Usuario'}
                </div>
            </div>
        </button>
    );

    const renderLogoutButton = (isMobile = false) => (
        <button
            type="button"
            onClick={handleLogoutClick}
            className={`btn w-full justify-start gap-2 border-none text-white shadow-md bg-gradient-to-r from-red-500 to-[var(--color-primary)] hover:from-red-600 hover:to-[var(--color-primary)] ${isMobile ? "btn-sm" : ""}`}
        >
            <BiLogOut className="w-4 h-4" /> Cerrar Sesion
        </button>
    );

    return (
        <>
            {!isOpen && (
                <button
                    className="app-menu-toggle lg:hidden btn btn-ghost btn-circle"
                    onClick={() => setIsOpen(true)}
                >
                    <FaBars className="w-6 h-6" />
                </button>
            )}
            <aside className="menu-header app-menu app-sidebar-panel app-sidebar-panel--open bg-base-100 hidden lg:flex">
                <div className="app-sidebar-brand">
                    <div className="logo-header" />
                </div>
                <div className="app-sidebar-top">
                    <div className="app-sidebar-actions">
                        <div className="dropdown dropdown-left hidden">
                            <button className="btn btn-ghost btn-circle">
                                <div className="indicator">
                                    <BiBell className="w-5 h-5" />
                                    <span className="badge badge-xs badge-primary indicator-item">3</span>
                                </div>
                            </button>
                            <div className="dropdown-content mt-3 z-[1] card card-compact w-64 bg-base-100 shadow">
                                <div className="card-body">
                                    <span className="font-bold text-lg">3 Notificaciones</span>
                                    <div className="space-y-2">
                                        <div className="alert alert-info alert-sm">
                                            <span>Nueva actualizacion disponible</span>
                                        </div>
                                        <div className="alert alert-success alert-sm">
                                            <span>Usuario creado correctamente</span>
                                        </div>
                                        <div className="alert alert-warning alert-sm">
                                            <span>Revisa los permisos del rol</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {renderProfileButton()}
                    </div>
                    <div className="mt-2">
                        <GlobalTrmBadge compact />
                    </div>
                    <div className="app-sidebar-divider" />
                </div>
                {renderMenuItems(menuItems, 0, false)}
                <div className="app-sidebar-footer">
                    {renderLogoutButton()}
                </div>
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative w-64 bg-base-100 p-4 overflow-y-auto app-drawer app-drawer-panel">
                        <button
                            className="absolute top-2 right-2 btn btn-sm btn-circle"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>
                        <div className="app-sidebar-top app-sidebar-top--mobile">
                            <div className="app-sidebar-actions">
                                <div className="dropdown dropdown-left hidden">
                                    <button className="btn btn-ghost btn-circle">
                                        <div className="indicator">
                                            <BiBell className="w-5 h-5" />
                                            <span className="badge badge-xs badge-primary indicator-item">3</span>
                                        </div>
                                    </button>
                                    <div className="dropdown-content mt-3 z-[1] card card-compact w-64 bg-base-100 shadow">
                                        <div className="card-body">
                                            <span className="font-bold text-lg">3 Notificaciones</span>
                                            <div className="space-y-2">
                                                <div className="alert alert-info alert-sm">
                                                    <span>Nueva actualizacion disponible</span>
                                                </div>
                                                <div className="alert alert-success alert-sm">
                                                    <span>Usuario creado correctamente</span>
                                                </div>
                                                <div className="alert alert-warning alert-sm">
                                                    <span>Revisa los permisos del rol</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {renderProfileButton()}
                            </div>
                            <div className="mt-2">
                                <GlobalTrmBadge compact />
                            </div>
                            <div className="app-sidebar-divider" />
                        </div>
                        {renderMenuItems(menuItems, 0, true)}
                        <div className="app-sidebar-footer app-sidebar-footer--mobile">
                            {renderLogoutButton(true)}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
