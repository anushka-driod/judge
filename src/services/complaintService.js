import { request } from './api';
import { mockComplaints } from '../data/mockData';

let localComplaints = [...mockComplaints];
let localSecondOpinions = [];

export const complaintService = {
  async getComplaints() {
    return request('/complaints', {}, () => [...localComplaints]);
  },

  async getComplaintById(id) {
    return request(`/complaints/${id}`, {}, () => {
      const c = localComplaints.find((comp) => comp.id === id);
      if (!c) throw new Error('Complaint record not found');
      return c;
    });
  },

  async submitComplaint({ lawyerId, lawyerName, caseId, issueCategory, description, evidenceDocument }) {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify({ lawyerId, lawyerName, caseId, issueCategory, description, evidenceDocument }),
    }, () => {
      const newComplaint = {
        id: `comp-${Date.now()}`,
        caseId: caseId || 'General',
        lawyerId,
        lawyerName: lawyerName || 'Advocate',
        issueCategory: issueCategory || 'Service Issue',
        description,
        evidenceDocument: evidenceDocument || 'Supporting_Documents.pdf',
        status: 'Submitted',
        submittedDate: new Date().toISOString().split('T')[0],
        neutralAssessment: 'The reported grievance has been logged. Platform policy requires sending a neutral request for response to the advocate before initiating escalation steps.',
        escalationOptions: [
          'Request amicable mediation via VidhiSetu Grievance Panel',
          'Free substitution with alternative verified counsel',
          'Formal submission assistance to State Bar Council Disciplinary Committee',
        ],
      };
      localComplaints = [newComplaint, ...localComplaints];
      return newComplaint;
    });
  },

  async requestSecondOpinion({ caseId, concern, documentNames }) {
    return request('/second-opinion', {
      method: 'POST',
      body: JSON.stringify({ caseId, concern, documentNames }),
    }, () => {
      const opinion = {
        id: `sec-op-${Date.now()}`,
        caseId,
        concern,
        documentNames: documentNames || [],
        status: 'Pending Review',
        requestedAt: new Date().toISOString(),
        estimatedTurnaround: '48 Hours',
        notes: 'An independent senior counsel panel is reviewing the initial advice against the Indian precedents on record.',
      };
      localSecondOpinions.push(opinion);
      return opinion;
    });
  },
};
