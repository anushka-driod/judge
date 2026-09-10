import { request } from './api';
import { mockLawyers } from '../data/mockData';

export const lawyerService = {
  async getRecommendedLawyers(category = '', location = '') {
    return request('/lawyers/recommended', {}, () => {
      let results = [...mockLawyers];
      if (category) {
        results = results.filter((lawyer) =>
          lawyer.practiceAreas.some((area) => area.toLowerCase().includes(category.toLowerCase()))
        );
      }
      return results.length > 0 ? results : mockLawyers;
    });
  },

  async getAllLawyers(filters = {}) {
    return request('/lawyers', {}, () => {
      let filtered = [...mockLawyers];
      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.name.toLowerCase().includes(query) ||
            l.location.toLowerCase().includes(query) ||
            l.practiceAreas.some((p) => p.toLowerCase().includes(query))
        );
      }
      if (filters.maxFee) {
        filtered = filtered.filter((l) => l.consultationFee <= filters.maxFee);
      }
      return filtered;
    });
  },

  async getLawyerById(id) {
    return request(`/lawyers/${id}`, {}, () => {
      const lawyer = mockLawyers.find((l) => l.id === id);
      if (!lawyer) throw new Error(`Lawyer with ID ${id} not found`);
      return lawyer;
    });
  },
};
