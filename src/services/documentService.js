import { request } from './api';
import { mockCases } from '../data/mockData';

// Consolidate documents from cases
let allDocs = mockCases.flatMap((c) =>
  (c.documents || []).map((d) => ({ ...d, caseId: c.id, caseTitle: c.title }))
);

export const documentService = {
  async getAllDocuments() {
    return request('/documents', {}, () => [...allDocs]);
  },

  async uploadDocument({ name, type, size, caseId, file }) {
    return request('/documents/upload', {
      method: 'POST',
      body: JSON.stringify({ name, type, size, caseId }),
    }, () => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: name || 'Document.pdf',
        type: type || 'Other Supporting Document',
        size: size || '1.5 MB',
        uploadedAt: new Date().toISOString().split('T')[0],
        caseId: caseId || 'General',
        caseTitle: caseId ? 'Attached to Case' : 'Personal Legal Vault',
        fileUrl: '#',
      };
      allDocs = [newDoc, ...allDocs];
      return newDoc;
    });
  },

  async deleteDocument(id) {
    return request(`/documents/${id}`, { method: 'DELETE' }, () => {
      allDocs = allDocs.filter((d) => d.id !== id);
      return { success: true };
    });
  },
};
