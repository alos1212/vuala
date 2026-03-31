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
import RegisterPage from "../pages/auth/RegisterPage"
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
import AgenciesPage from "../pages/agencies/AgenciesPage"
import AgencyDetailPage from "../pages/agencies/AgencyDetailPage"
import AgencyCreatePage from "../pages/agencies/AgencyCreatePage"
import AgencyEditPage from "../pages/agencies/AgencyEditPage"
import MyAgencyEditPage from "../pages/agencies/MyAgencyEditPage"
import AgencyCrmDashboardPage from "../pages/crm/AgencyCrmDashboardPage"
import AgencyCrmTasksPage from "../pages/crm/AgencyCrmTasksPage"
import AgencyCrmActivityFormPage from "../pages/crm/AgencyCrmActivityFormPage"

const AppRouter: React.FC = () => {
    const { isAuthenticated, hasPermission } = useAuthStore()
    const authenticatedHome = hasPermission("agencies.list")
        ? "/agencies"
        : hasPermission("agency-crm.activities.list")
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
                                element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <RegisterPage />}
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
                            <Route
                                path="/my-agency"
                                element={
                                    <ProtectedRoute permission="my-agency.read">
                                        <AgencyDetailPage selfMode />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/my-agency/edit"
                                element={
                                    <ProtectedRoute permission="my-agency.update">
                                        <MyAgencyEditPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/my-agency/users/:userId/profile"
                                element={
                                    <ProtectedRoute permissionAny={["my-agency.users.list", "my-agency.users.update"]}>
                                        <UserProfilePage />
                                    </ProtectedRoute>
                                }
                            />
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
                                path="agencies"
                                element={
                                    <ProtectedRoute permission="agencies.list">
                                        <AgenciesPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="agencies/create"
                                element={
                                    <ProtectedRoute permission="agencies.create">
                                        <AgencyCreatePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="agencies/:id/edit"
                                element={
                                    <ProtectedRoute permission="agencies.update">
                                        <AgencyEditPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="agencies/:id"
                                element={
                                    <ProtectedRoute permission="agencies.list">
                                        <AgencyDetailPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="agencies/:agencyId/users/:userId/profile"
                                element={
                                    <ProtectedRoute permissionAny={["agencies.list", "agencies.read", "agencies.update"]}>
                                        <UserProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm"
                                element={
                                    <ProtectedRoute permission="agency-crm.activities.list">
                                        <AgencyCrmDashboardPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones"
                                element={
                                    <ProtectedRoute permission="agency-crm.activities.list">
                                        <AgencyCrmTasksPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones/nueva"
                                element={
                                    <ProtectedRoute permission="agency-crm.activities.create">
                                        <AgencyCrmActivityFormPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="crm/gestiones/:id/editar"
                                element={
                                    <ProtectedRoute permission="agency-crm.activities.update">
                                        <AgencyCrmActivityFormPage />
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
