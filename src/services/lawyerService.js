import { request } from './api';

export const lawyerService = {
  async getRecommendedLawyers(category = '', location = '') {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (location) params.append('city', location);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return request(`/lawyers/recommendations${queryString}`);
  },

  async getAllLawyers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.maxFee) params.append('maxFee', filters.maxFee);
    if (filters.city) params.append('city', filters.city);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return request(`/lawyers${queryString}`);
  },

  async getLawyerById(id) {
    return request(`/lawyers/${id}`);
  },
};
