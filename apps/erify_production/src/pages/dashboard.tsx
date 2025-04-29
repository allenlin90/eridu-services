import { Navigate } from "react-router";

export const Dashboard: React.FC = () => {
  // TODO: dashboard specific for the user by role and RBAC
  return <Navigate to="/shows" />;
};

export default Dashboard;
