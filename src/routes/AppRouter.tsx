import type React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { queryClient } from "../lib/queryClient"
import { useAuthStore } from "../stores/authStore"

// Layouts
import MainLayout from "../components/layout/MainLayout"
import AuthLayout from "../components/layout/AuthLayout"
import RolesLayout from "../pages/roles/RolesLayout"

// Pages
import LoginPage from "../pages/auth/LoginPage"
import ResetPasswordPage from "../pages/auth/ResetPasswordPage"
import DashboardPage from "../pages/DashboardPage"
import DashboardLandingPage from "../pages/DashboardLandingPage"
import ProfilePage from "../pages/profile/ProfilePage"
import UsersPage from "../pages/users/UsersPage"
import UserProfilePage from "../pages/users/UserProfilePage"
import RolesPage from "../components/roles/RolesPage"
import PermissionsPage from "../components/roles/PermissionsPage"
//import ProfilePage from '../pages/ProfilePage';

// Guards
import ProtectedRoute from "../components/auth/ProtectedRoute"
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage"
import CompaniesPage from "../pages/companies/CompaniesPage"
import CompanyDetailPage from "../pages/companies/CompanyDetailPage"
import CompanyFormPage from "../pages/companies/CompanyFormPage"
import ClientsPage from "../pages/clients/ClientsPage"
import ClientDetailPage from "../pages/clients/ClientDetailPage"
import ClientFormPage from "../pages/clients/ClientFormPage"
import CrmDashboardPage from "../pages/crm/CrmDashboardPage"
import CrmTasksPage from "../pages/crm/CrmTasksPage"
import CrmActivityFormPage from "../pages/crm/CrmActivityFormPage"

const AppRouter: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuthStore()
    const authenticatedHome = hasPermission("companies.list")
        ? "/companies"
        : hasPermission("crm.activities.list")
            ? "/crm"
            : "/dashboard/home"

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <div data-theme="admin">
                    <Routes>
                        {/* Rutas públicas */}
                        <Route element={<AuthLayout />}>
                            <Route path="/login" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LoginPage />} />
                            <Route
                                path="/register"
                                element={<Navigate to={isAuthenticated ? authenticatedHome : "/login"} replace />}
                            />

                            <Route
                                path="/forgot-password"
                                element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <ForgotPasswordPage />}
                            />
                            <Route
                                path="/reset-password"
                                element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <ResetPasswordPage />}
                            />
                        </Route>

                        {/* Rutas protegidas */}
                        <Route
                            element={
                                <ProtectedRoute>
                                    <MainLayout />{" "}
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/dashboard" element={<DashboardLandingPage />} />
                            <Route path="/dashboard/home" element={<DashboardPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route element={<RolesLayout />}>
                                <Route
                                    path="users"
                                    element={
                                        <ProtectedRoute permission="users.list">
                                            <UsersPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="users/:id/profile"
                                    element={
                                        <ProtectedRoute permission="users.read">
                                            <UserProfilePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="roles"
                                    element={
                                        <ProtectedRoute permission="roles.list">
                                            <RolesPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="permissions"
                                    element={
                                        <ProtectedRoute permission="permissions.list">
                                            <PermissionsPage />
                                        </ProtectedRoute>
                                    }
                                />

                            </Route>
                            <Route
                                path="companies"
                                element={
                                    <ProtectedRoute permission="companies.list">
                                        <CompaniesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="companies/create"
                                element={
                                    <ProtectedRoute permission="companies.create">
                                        <CompanyFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="companies/:id/edit"
                                element={
                                    <ProtectedRoute permission="companies.update">
                                        <CompanyFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="companies/:id"
                                element={
                                    <ProtectedRoute permission="companies.read">
                                        <CompanyDetailPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="companies/:companyId/users/:userId/profile"
                                element={
                                    <ProtectedRoute permissionAny={["companies.users.list", "companies.users.update"]}>
                                        <UserProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="clients"
                                element={
                                    <ProtectedRoute permission="clients.list">
                                        <ClientsPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="clients/create"
                                element={
                                    <ProtectedRoute permission="clients.create">
                                        <ClientFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="clients/:id/edit"
                                element={
                                    <ProtectedRoute permission="clients.update">
                                        <ClientFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="clients/:id"
                                element={
                                    <ProtectedRoute permission="clients.read">
                                        <ClientDetailPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm"
                                element={
                                    <ProtectedRoute permission="crm.activities.list">
                                        <CrmDashboardPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones"
                                element={
                                    <ProtectedRoute permission="crm.activities.list">
                                        <CrmTasksPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones/nueva"
                                element={
                                    <ProtectedRoute permission="crm.activities.create">
                                        <CrmActivityFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones/:id/editar"
                                element={
                                    <ProtectedRoute permission="crm.activities.update">
                                        <CrmActivityFormPage />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>


                        <Route path="/" element={<Navigate to={isAuthenticated ? authenticatedHome : "/login"} replace />} />
                        <Route path="*" element={<Navigate to={isAuthenticated ? authenticatedHome : "/login"} replace />} />
                    </Routes>

                    {/* React Query DevTools (solo en desarrollo) */}
                    <ReactQueryDevtools initialIsOpen={false} />
                </div>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default AppRouter
