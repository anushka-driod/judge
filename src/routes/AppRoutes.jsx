import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthLayout } from '../components/layout/AuthLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { EmailVerificationPage } from '../pages/auth/EmailVerificationPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Advocate & Admin Experience
import { AdvocateStatusPage } from '../pages/advocate/AdvocateStatusPage';
import { AdvocateDashboardPage } from '../pages/advocate/AdvocateDashboardPage';
import { AdminVerificationPage } from '../pages/admin/AdminVerificationPage';

// Dedicated Lawyer Portal Architecture
import { LawyerLayout } from '../components/lawyer/LawyerLayout';
import { LawyerLoginPage } from '../pages/lawyer/LawyerLoginPage';
import { LawyerRegisterPage } from '../pages/lawyer/LawyerRegisterPage';
import { LawyerVerificationStatusPage } from '../pages/lawyer/LawyerVerificationStatusPage';
import { LawyerDashboardPage } from '../pages/lawyer/LawyerDashboardPage';
import { LawyerRequestsPage } from '../pages/lawyer/LawyerRequestsPage';
import { LawyerCasesPage } from '../pages/lawyer/LawyerCasesPage';
import { LawyerCaseWorkspacePage } from '../pages/lawyer/LawyerCaseWorkspacePage';
import { LawyerCalendarPage } from '../pages/lawyer/LawyerCalendarPage';
import { LawyerEarningsPage } from '../pages/lawyer/LawyerEarningsPage';
import { LawyerProfilePage as LawyerChambersProfilePage } from '../pages/lawyer/LawyerProfilePage';
import { AdminLawyersPage } from '../pages/admin/AdminLawyersPage';
import { AdminPaymentsPage } from '../pages/admin/AdminPaymentsPage';
import { CitizenPaymentsPage } from '../pages/payments/CitizenPaymentsPage';

// Main Dashboard & Legal Chat
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AIChatPage } from '../pages/chat/AIChatPage';
import { AIGuidanceResultsPage } from '../pages/guidance/AIGuidanceResultsPage';
import { RelevantLawsPage } from '../pages/legalResearch/RelevantLawsPage';
import { JudgmentDetailsPage } from '../pages/legalResearch/JudgmentDetailsPage';

// Cases Management & Self-Help
import { CasesListPage } from '../pages/cases/CasesListPage';
import { CaseDetailsPage } from '../pages/cases/CaseDetailsPage';
import { NewCasePage } from '../pages/cases/NewCasePage';
import { SelfHelpModePage } from '../pages/selfHelp/SelfHelpModePage';
import { ActionPlanPage } from '../pages/selfHelp/ActionPlanPage';

// Lawyers & Consultations
import { LawyerRecommendationsPage } from '../pages/lawyers/LawyerRecommendationsPage';
import { LawyerProfilePage } from '../pages/lawyers/LawyerProfilePage';
import { BookConsultationPage } from '../pages/consultation/BookConsultationPage';
import { ConsultationConfirmationPage } from '../pages/consultation/ConsultationConfirmationPage';

// Document Vault & Notifications
import { DocumentsPage } from '../pages/documents/DocumentsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';

// Post-Consultation (Second Opinion & Lawyer Grievance)
import { SecondOpinionPage } from '../pages/secondOpinion/SecondOpinionPage';
import { LawyerComplaintPage } from '../pages/complaints/LawyerComplaintPage';
import { EscalationTrackingPage } from '../pages/complaints/EscalationTrackingPage';

// 404
import { NotFoundPage } from '../pages/notFound/NotFoundPage';

<<<<<<< HEAD
// Landing & Marketing Page
import { LandingPage } from '../pages/landing/LandingPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Home & Auth Routes */}
      <Route path="/" element={<LandingPage />} />
=======
export function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
>>>>>>> origin/main
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Dedicated Lawyer Portal Auth Routes */}
      <Route path="/lawyer/login" element={<LawyerLoginPage />} />
      <Route path="/lawyer/register" element={<LawyerRegisterPage />} />
      <Route path="/lawyer/verification-status" element={<LawyerVerificationStatusPage />} />

      {/* Protected Lawyer Portal Chambers Routes */}
      <Route path="/lawyer" element={<LawyerLayout />}>
        <Route index element={<Navigate to="/lawyer/dashboard" replace />} />
        <Route path="dashboard" element={<LawyerDashboardPage />} />
        <Route path="requests" element={<LawyerRequestsPage />} />
        <Route path="cases" element={<LawyerCasesPage />} />
        <Route path="cases/:caseId" element={<LawyerCaseWorkspacePage />} />
        <Route path="calendar" element={<LawyerCalendarPage />} />
        <Route path="messages" element={<LawyerRequestsPage />} />
        <Route path="earnings" element={<LawyerEarningsPage />} />
        <Route path="profile" element={<LawyerChambersProfilePage />} />
        <Route path="consultations" element={<LawyerCalendarPage />} />
      </Route>

      {/* Admin Lawyer Verification & Oversight Docket */}
      <Route path="/admin/lawyers" element={<AdminLawyersPage />} />
      <Route path="/admin/lawyers/:id" element={<AdminLawyersPage />} />

<<<<<<< HEAD
      {/* Public Legal Agent & Legal Research (Accessible without authentication) */}
      <Route element={<AppLayout />}>
        {/* AI Legal Assistant - Public Citizen Agent */}
        <Route path="/chat" element={<AIChatPage />} />
        <Route path="/chat/:sessionId" element={<AIChatPage />} />

        {/* Public Legal Research & Guidance Views */}
        <Route path="/cases/:caseId/guidance" element={<AIGuidanceResultsPage />} />
        <Route path="/cases/:caseId/laws" element={<RelevantLawsPage />} />
        <Route path="/judgments/:judgmentId" element={<JudgmentDetailsPage />} />
        <Route path="/cases/:caseId/self-help" element={<SelfHelpModePage />} />
        <Route path="/cases/:caseId/action-plan" element={<ActionPlanPage />} />
        <Route path="/cases/:caseId/lawyers" element={<LawyerRecommendationsPage />} />
        <Route path="/lawyers/:lawyerId" element={<LawyerProfilePage />} />
      </Route>

      {/* Protected Routes (Require Verified Login) */}
=======
      {/* Protected Routes */}
>>>>>>> origin/main
      <Route element={<ProtectedRoute />}>
        {/* Advocate Experience Screens (Unwrapped by standard citizen sidebar) */}
        <Route path="/advocate/status" element={<AdvocateStatusPage />} />
        <Route path="/advocate/dashboard" element={<AdvocateDashboardPage />} />

        {/* Administrator Oversight */}
        <Route path="/admin/verifications" element={<AdminVerificationPage />} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />

<<<<<<< HEAD
        {/* Protected Citizen Cases Workspace */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
=======
        {/* Standard VidhiSetu Legal Assistant & Cases Workspace */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/dashboard" element={<Navigate to="/chat" replace />} />

          {/* AI Legal Assistant */}
          <Route path="/chat" element={<AIChatPage />} />
          <Route path="/chat/:sessionId" element={<AIChatPage />} />
>>>>>>> origin/main

          {/* Consultation Payments & Invoices */}
          <Route path="/payments" element={<CitizenPaymentsPage />} />

<<<<<<< HEAD
          {/* User-Isolated Cases */}
          <Route path="/cases" element={<CasesListPage />} />
          <Route path="/cases/new" element={<NewCasePage />} />
          <Route path="/cases/:caseId" element={<CaseDetailsPage />} />

          {/* Booking Consultations */}
=======
          {/* Cases */}
          <Route path="/cases" element={<CasesListPage />} />
          <Route path="/cases/new" element={<NewCasePage />} />
          <Route path="/cases/:caseId" element={<CaseDetailsPage />} />
          <Route path="/cases/:caseId/guidance" element={<AIGuidanceResultsPage />} />
          <Route path="/cases/:caseId/laws" element={<RelevantLawsPage />} />
          <Route path="/judgments/:judgmentId" element={<JudgmentDetailsPage />} />

          {/* Self-Help */}
          <Route path="/cases/:caseId/self-help" element={<SelfHelpModePage />} />
          <Route path="/cases/:caseId/action-plan" element={<ActionPlanPage />} />

          {/* Lawyers & Booking */}
          <Route path="/cases/:caseId/lawyers" element={<LawyerRecommendationsPage />} />
          <Route path="/lawyers/:lawyerId" element={<LawyerProfilePage />} />
>>>>>>> origin/main
          <Route path="/lawyers/:lawyerId/book" element={<BookConsultationPage />} />
          <Route path="/consultation/confirmed/:bookingId" element={<ConsultationConfirmationPage />} />

          {/* Documents & Reminders */}
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Second Opinion & Complaints */}
          <Route path="/cases/:caseId/second-opinion" element={<SecondOpinionPage />} />
          <Route path="/cases/:caseId/complaint" element={<LawyerComplaintPage />} />
          <Route path="/complaints/:complaintId" element={<EscalationTrackingPage />} />

          {/* 404 inside layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
