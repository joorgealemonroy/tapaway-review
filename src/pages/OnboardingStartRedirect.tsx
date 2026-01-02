import { Navigate, useLocation } from "react-router-dom";

const OnboardingStartRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/onboarding-start${location.search}`} replace />;
};

export default OnboardingStartRedirect;
