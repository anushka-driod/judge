import { request } from './api';

export const documentService = {
  async getAllDocuments() {
    return request('/documents');
  },

  async uploadDocument({ name, type, size, caseId, file }) {
    return request('/documents/upload', {
      method: 'POST',
      body: JSON.stringify({ name, type, size, caseId, file }),
    });
  },

  async deleteDocument(id) {
    return request(`/documents/${id}`, { method: 'DELETE' });
  },
};
