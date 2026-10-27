import { request } from './api';

export const caseService = {
  async getAllCases() {
    return request('/cases');
  },

  async getCaseById(id) {
    return request(`/cases/${id}`);
  },

  async createCase({ title, category, description, documents = [] }) {
    return request('/cases', {
      method: 'POST',
      body: JSON.stringify({ title, category, description, documents }),
    });
  },

  async updateCaseStatus(caseId, status) {
    return request(`/cases/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateActionPlanItem(caseId, actionId, newStatus) {
    return request(`/cases/${caseId}/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
  },

  async selectCaseMode(caseId, mode) {
    return request(`/cases/${caseId}/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    });
  },
};
