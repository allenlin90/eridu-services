import { Navigate } from "react-router";

export const LivestreamDashboard: React.FC = () => {
  // TODO: dashboard specific for the user by role and RBAC
  return <Navigate to="/livestream/shows" />;
};

export default LivestreamDashboard;
