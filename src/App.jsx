import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CreateContractPage from './pages/CreateContractPage.jsx';
import ContractPage from './pages/ContractPage.jsx';
import FundEscrowPage from './pages/FundEscrowPage.jsx';
import MilestonePage from './pages/MilestonePage.jsx';
import MilestoneReviewPage from './pages/MilestoneReviewPage.jsx';
import SettlementPage from './pages/SettlementPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import CompliancePage from './pages/CompliancePage.jsx';
import KycCallbackPage from './pages/KycCallbackPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/kyc-callback" element={<KycCallbackPage />} />
      <Route path="/wallet" element={<WalletPage />} />

      <Route element={<AppLayout activeId="dashboard" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route element={<AppLayout activeId="profile" />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route element={<AppLayout activeId="contracts" />}>
        <Route path="/contracts/create" element={<CreateContractPage />} />
        <Route path="/contracts/:id" element={<ContractPage />} />
        <Route path="/contracts/:id/fund" element={<FundEscrowPage />} />
        <Route path="/contracts/:contractId/milestones/:milestoneId" element={<MilestonePage />} />
        <Route path="/contracts/:contractId/milestones/:milestoneId/review" element={<MilestoneReviewPage />} />
        <Route path="/contracts/:contractId/milestones/:milestoneId/settlement" element={<SettlementPage />} />
      </Route>
      <Route element={<AppLayout activeId="payments" />}>
        <Route path="/payments" element={<PaymentsPage />} />
      </Route>
      <Route element={<AppLayout activeId="compliance" />}>
        <Route path="/compliance" element={<CompliancePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
