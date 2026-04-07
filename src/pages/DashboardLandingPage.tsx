import React from "react";
import { Navigate } from "react-router-dom";

const DashboardLandingPage: React.FC = () => {
    return <Navigate to="/dashboard/home" replace />;
};

export default DashboardLandingPage;
