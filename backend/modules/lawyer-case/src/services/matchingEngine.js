/**
 * Multi-Factor Lawyer Matching Engine
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Evaluates candidate advocates using 5 distinct weighted factors:
 * - Specialization Match (40%)
 * - Jurisdiction & Forum Match (25%)
 * - Location / Proximity Match (15%)
 * - Experience (10%)
 * - Availability & Preferred Mode (10%)
 *
 * Does NOT rely merely on public ratings.
 */

export class LawyerMatchingEngine {
  /**
   * Evaluates and scores lawyers against user case criteria.
   * @param {Object} caseContext - e.g. { category: 'labour_law', jurisdiction: 'Karnataka', city: 'Bengaluru', preferredMode: 'video' }
   * @param {Array} lawyersPool - Array of lawyer records
   * @returns {Array} Sorted list of lawyers with match scores and analytical breakdown
   */
  static rankLawyers(caseContext, lawyersPool = []) {
    const {
      category = '',
      jurisdiction = '',
      city = '',
      preferredCourt = '',
      preferredMode = 'video',
      minExperience = 0,
    } = caseContext;

    const normalizedCategory = category.toLowerCase().trim();
    const normalizedJurisdiction = jurisdiction.toLowerCase().trim();
    const normalizedCity = city.toLowerCase().trim();
    const normalizedCourt = preferredCourt.toLowerCase().trim();

    // 1. Hard Filter: Must be in 'verified' or 'active' status and available
    const eligibleLawyers = lawyersPool.filter((l) => {
      const isVerified = l.verification_status === 'verified' || l.verification_status === 'active';
      const isAvail = l.is_available !== false;
      return isVerified && isAvail;
    });

    // 2. Score each eligible advocate
    const scored = eligibleLawyers.map((lawyer) => {
      const matchBreakdown = {
        specializationScore: 0,
        jurisdictionScore: 0,
        locationScore: 0,
        experienceScore: 0,
        modeAvailabilityScore: 0,
      };
      const reasons = [];

      // A. Specialization Match (Weight: 40 points max)
      const lawyerSpecs = (lawyer.specializations || []).map((s) => s.toLowerCase());
      const hasDirectSpec = lawyerSpecs.some(
        (s) => s.includes(normalizedCategory) || normalizedCategory.includes(s)
      );
      if (hasDirectSpec) {
        matchBreakdown.specializationScore = 40;
        reasons.push(`Direct expertise in ${category}`);
      } else {
        // Partial relevance
        const hasRelated = lawyerSpecs.some((s) => s.includes('civil') || s.includes('general'));
        matchBreakdown.specializationScore = hasRelated ? 15 : 0;
      }

      // B. Jurisdiction & Court Match (Weight: 25 points max)
      const lawyerJurisdiction = (lawyer.primary_jurisdiction || '').toLowerCase();
      const lawyerCourt = (lawyer.primary_court || '').toLowerCase();

      if (normalizedJurisdiction && lawyerJurisdiction.includes(normalizedJurisdiction)) {
        matchBreakdown.jurisdictionScore += 15;
        reasons.push(`Licensed for practice in ${lawyer.primary_jurisdiction}`);
      }
      if (normalizedCourt && lawyerCourt.includes(normalizedCourt)) {
        matchBreakdown.jurisdictionScore += 10;
        reasons.push(`Regular appearance before ${lawyer.primary_court}`);
      } else if (!normalizedCourt && matchBreakdown.jurisdictionScore > 0) {
        matchBreakdown.jurisdictionScore += 10;
      }

      // C. Location / City Proximity (Weight: 15 points max)
      const lawyerCity = (lawyer.location_city || '').toLowerCase();
      if (normalizedCity && lawyerCity.includes(normalizedCity)) {
        matchBreakdown.locationScore = 15;
        reasons.push(`Local presence in ${lawyer.location_city} for physical filings`);
      } else {
        matchBreakdown.locationScore = 5; // Cross-city capability
      }

      // D. Experience Evaluation (Weight: 10 points max)
      const exp = lawyer.years_of_experience || 0;
      if (exp >= minExperience) {
        // Scaled: 15+ years = 10 pts, 10-14 years = 8 pts, 5-9 = 6 pts, <5 = 4 pts
        if (exp >= 15) matchBreakdown.experienceScore = 10;
        else if (exp >= 10) matchBreakdown.experienceScore = 8;
        else if (exp >= 5) matchBreakdown.experienceScore = 6;
        else matchBreakdown.experienceScore = 4;
        reasons.push(`${exp} years of active Bar standing`);
      }

      // E. Consultation Mode & Availability (Weight: 10 points max)
      const modes = (lawyer.consultation_modes || []).map((m) => m.toLowerCase());
      if (modes.includes(preferredMode.toLowerCase())) {
        matchBreakdown.modeAvailabilityScore = 10;
        reasons.push(`Supports ${preferredMode} consultations`);
      } else {
        matchBreakdown.modeAvailabilityScore = 5;
      }

      const totalScore = Math.min(
        100,
        matchBreakdown.specializationScore +
          matchBreakdown.jurisdictionScore +
          matchBreakdown.locationScore +
          matchBreakdown.experienceScore +
          matchBreakdown.modeAvailabilityScore
      );

      return {
        lawyerId: lawyer.id,
        name: lawyer.name,
        barRegistrationNumber: lawyer.bar_registration_number,
        primaryJurisdiction: lawyer.primary_jurisdiction,
        primaryCourt: lawyer.primary_court,
        locationCity: lawyer.location_city,
        yearsOfExperience: lawyer.years_of_experience,
        consultationFee: lawyer.consultation_fee,
        consultationModes: lawyer.consultation_modes,
        verificationStatus: lawyer.verification_status,
        matchScore: totalScore,
        matchBreakdown,
        matchReasons: reasons,
      };
    });

    // 3. Sort descending by matchScore
    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }
}
