import { request } from './api';

export const lawyerPortalClient = {
  // Authentication & Profile
  async register(data) {
    const res = await request('/lawyer/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
      localStorage.setItem('vidhisetu_user_role', 'lawyer');
    }
    return res;
  },

  async login(email, password) {
    const res = await request('/lawyer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res?.token) {
      localStorage.setItem('vidhisetu_auth_token', res.token);
      localStorage.setItem('earnlaw_auth_token', res.token);
      localStorage.setItem('vidhisetu_user_role', 'lawyer');
      if (res.lawyer) {
        localStorage.setItem('vidhisetu_lawyer_profile', JSON.stringify(res.lawyer));
      }
    }
    return res;
  },

  async getMe() {
    return request('/lawyer/me');
  },

  async updateProfile(updates) {
    return request('/lawyer/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Dashboard
  async getDashboard() {
    return request('/lawyer/dashboard');
  },

  // Requests
  async getRequests() {
    return request('/lawyer/requests');
  },

  async getRequestById(id) {
    return request(`/lawyer/requests/${id}`);
  },

  async acceptRequest(id, remarks = '') {
    return request(`/lawyer/requests/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },

  async rejectRequest(id, reason = '') {
    return request(`/lawyer/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async requestMoreInfo(id, questions = '') {
    return request(`/lawyer/requests/${id}/more-info`, {
      method: 'POST',
      body: JSON.stringify({ questions }),
    });
  },

  // Cases & Workspace
  async getCases() {
    return request('/lawyer/cases');
  },

  async getCaseById(caseId) {
    return request(`/lawyer/cases/${caseId}`);
  },

  async getCaseDocuments(caseId) {
    return request(`/lawyer/cases/${caseId}/documents`);
  },

  async getCaseAiResearch(caseId) {
    return request(`/lawyer/cases/${caseId}/research`);
  },

  // Messages / Chat
  async getMessages(caseId) {
    return request(`/lawyer/cases/${caseId}/messages`);
  },

  async sendMessage(caseId, messageData) {
    return request(`/lawyer/cases/${caseId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Timeline
  async getTimeline(caseId) {
    return request(`/lawyer/cases/${caseId}/timeline`);
  },

  async addTimelineEvent(caseId, eventData) {
    return request(`/lawyer/cases/${caseId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  // Action Plan
  async getActionPlan(caseId) {
    return request(`/lawyer/cases/${caseId}/action-plan`);
  },

  async addActionItem(caseId, itemData) {
    return request(`/lawyer/cases/${caseId}/action-plan`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  async updateActionItem(caseId, actionId, updates) {
    return request(`/lawyer/cases/${caseId}/action-plan/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Notes
  async getNotes(caseId) {
    return request(`/lawyer/cases/${caseId}/notes`);
  },

  async addNote(caseId, noteData) {
    return request(`/lawyer/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  },

  // Availability & Consultations
  async getAvailability() {
    return request('/lawyer/availability');
  },

  async updateAvailability(availabilityData) {
    return request('/lawyer/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
  },

  async getConsultations() {
    return request('/lawyer/consultations');
  },

  // Earnings
  async getEarnings() {
    return request('/lawyer/earnings');
  },

  // Calls
  async initiateCall(caseId, consultationType = 'video') {
    return request('/lawyer/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ caseId, consultationType }),
    });
  },

  async endCall(callId, data = {}) {
    return request(`/lawyer/calls/${callId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Client Consent Management
  async grantConsent(caseId, consentData) {
    return request(`/cases/${caseId}/consent`, {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },

  async revokeConsent(caseId, data) {
    return request(`/cases/${caseId}/consent/revoke`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin Oversight APIs
  async adminGetLawyers(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/admin/lawyers${query}`);
  },

  async adminGetLawyerById(id) {
    return request(`/admin/lawyers/${id}`);
  },

  async adminReviewLawyer(id, remarks = '') {
    return request(`/admin/lawyers/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },

  async adminApproveLawyer(id, remarks = '') {
    return request(`/admin/lawyers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },

  async adminRejectLawyer(id, reason = '') {
    return request(`/admin/lawyers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async adminRequestInfo(id, remarks = '') {
    return request(`/admin/lawyers/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },

  async adminSuspendLawyer(id, reason = '') {
    return request(`/admin/lawyers/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async adminGetAuditLogs(limit = 50) {
    return request(`/admin/audit-logs?limit=${limit}`);
  },
};

export default lawyerPortalClient;
