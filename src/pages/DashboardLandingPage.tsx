import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const DashboardLandingPage: React.FC = () => {
    const { hasPermission } = useAuthStore();

    if (hasPermission("companies.list")) {
        return <Navigate to="/companies" replace />;
    }

    if (hasPermission("crm.activities.list")) {
        return <Navigate to="/crm" replace />;
    }

    return <Navigate to="/dashboard/home" replace />;
};

export default DashboardLandingPage;
