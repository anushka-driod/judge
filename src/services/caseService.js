import { request } from './api';
import { mockCases, mockLawsDatabase, mockJudgmentsDatabase } from '../data/mockData';

// Local in-memory store so changes persist across screen navigation in mock mode
let localCases = [...mockCases];

export const caseService = {
  async getAllCases() {
    return request('/cases', {}, () => [...localCases]);
  },

  async getCaseById(id) {
    return request(`/cases/${id}`, {}, () => {
      const found = localCases.find((c) => c.id === id);
      if (!found) throw new Error(`Case with ID ${id} not found`);
      return found;
    });
  },

  async createCase({ title, category, description, documents = [] }) {
    return request('/cases', {
      method: 'POST',
      body: JSON.stringify({ title, category, description, documents }),
    }, () => {
      const newCase = {
        id: `case-${Date.now()}`,
        title,
        category: category || 'Consumer Dispute & Refund',
        shortDescription: description,
        status: 'AI Analysis',
        createdAt: new Date().toISOString(),
        currentStage: 'Preliminary AI Fact Mapping',
        nextAction: 'AI is analyzing statutory relevance and court precedents',
        nextActionDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        jurisdiction: 'District Consumer Disputes Redressal Commission',
        mode: 'pending_selection',
        aiGuidance: {
          understoodSummary: description,
          keyFindings: [
            'Prima facie grievance established based on user narration and documentary proof.',
            'Subject to limitation period of 2 years from cause of action.',
            'Pre-litigation conciliation or formal notice recommended as initial step.',
          ],
          relevantLaws: [mockLawsDatabase[0]],
          similarPrecedents: [mockJudgmentsDatabase[0]],
          suggestedNextSteps: [
            'Issue statutory demand notice with 15-day compliance window.',
            'File online grievance via official dispute portal.',
          ],
          usefulDocuments: ['Purchase Receipt / Invoices', 'Written Communications & Refusals'],
          recommendedPath: 'Self-Help Mode',
        },
        actionPlan: [
          {
            id: `act-${Date.now()}-1`,
            title: 'Collate and organize primary proof documents',
            whyItMatters: 'Claims without verified documentation face dismissal at admission.',
            requiredDocument: 'Primary bills or transaction records',
            deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            status: 'In Progress',
          },
        ],
        timeline: [
          { event: 'Case Created by User', date: new Date().toISOString().split('T')[0], status: 'completed', note: 'Case submitted in plain language' },
          { event: 'AI Legal Analysis', date: new Date().toISOString().split('T')[0], status: 'current', note: 'Mapping to applicable Indian statutes' },
          { event: 'Guidance & Precedents', date: 'Pending', status: 'upcoming' },
          { event: 'Action Initiated', date: 'Pending', status: 'upcoming' },
          { event: 'Resolution', date: 'Pending', status: 'upcoming' },
        ],
        documents: documents.map((d, index) => ({
          id: `doc-${Date.now()}-${index}`,
          name: d.name || 'Uploaded_Document.pdf',
          type: d.type || 'Other Supporting Document',
          size: d.size || '1.2 MB',
          uploadedAt: new Date().toISOString().split('T')[0],
          fileUrl: '#',
        })),
      };

      localCases = [newCase, ...localCases];
      return newCase;
    });
  },

  async updateCaseStatus(caseId, status) {
    return request(`/cases/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, () => {
      const idx = localCases.findIndex((c) => c.id === caseId);
      if (idx !== -1) {
        localCases[idx] = { ...localCases[idx], status };
        return localCases[idx];
      }
      throw new Error('Case not found');
    });
  },

  async updateActionPlanItem(caseId, actionId, newStatus) {
    return request(`/cases/${caseId}/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    }, () => {
      const c = localCases.find((c) => c.id === caseId);
      if (c && c.actionPlan) {
        const item = c.actionPlan.find((a) => a.id === actionId);
        if (item) item.status = newStatus;
        return c;
      }
      throw new Error('Case or action item not found');
    });
  },

  async selectCaseMode(caseId, mode) {
    return request(`/cases/${caseId}/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    }, () => {
      const c = localCases.find((c) => c.id === caseId);
      if (c) {
        c.mode = mode;
        c.status = mode === 'self_help' ? 'Self-Help' : 'Lawyer Consultation';
        return c;
      }
      throw new Error('Case not found');
    });
  },
};
