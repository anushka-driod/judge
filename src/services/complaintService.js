import { request } from './api';

export const complaintService = {
  async getComplaints() {
    return request('/complaints');
  },

  async getComplaintById(id) {
    return request(`/complaints/${id}`);
  },

  async submitComplaint({ lawyerId, lawyerName, caseId, issueCategory, description, evidenceDocument }) {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify({ lawyerId, lawyerName, caseId, issueCategory, description, evidenceDocument }),
    });
  },

  async requestSecondOpinion({ caseId, concern, documentNames }) {
    return request('/second-opinion', {
      method: 'POST',
      body: JSON.stringify({ caseId, concern, documentNames }),
    });
  },
};
