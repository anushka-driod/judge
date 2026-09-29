/**
 * Legal Knowledge & Case Relationships Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Manages:
 * - Legal categories & taxonomy
 * - Statutory laws and sections (with citizen-friendly plain meaning)
 * - Judicial precedent metadata
 * - Case relationship graph (cites, cited_by, follows, distinguishes, overrules, refers_to)
 */

export const RELATIONSHIP_TYPES = {
  CITES: 'cites',
  CITED_BY: 'cited_by',
  FOLLOWS: 'follows',
  DISTINGUISHES: 'distinguishes',
  OVERRULES: 'overrules',
  REFERS_TO: 'refers_to',
};

// Seed knowledge base for Indian Statutory Laws
const statutoryLaws = [
  {
    id: 'law-cpa-35',
    act_name: 'Consumer Protection Act, 2019',
    section_number: 'Section 35',
    section_title: 'Manner in which complaint shall be made',
    description: 'Empowers any consumer or recognized consumer association to file a complaint electronically via e-Daakhil without physical court appearance.',
    plain_meaning: 'You can submit your consumer grievance online from home directly to the District Commission without mandatory lawyer hiring.',
    penalty_or_remedy: 'Refund of product cost, replacement of goods, compensation for harassment, and punitive damages.',
    jurisdiction: 'India (Central)',
    forum: 'District Consumer Disputes Redressal Commission (DCDRC)',
  },
  {
    id: 'law-ni-138',
    act_name: 'Negotiable Instruments Act, 1881',
    section_number: 'Section 138',
    section_title: 'Dishonour of cheque for insufficiency of funds',
    description: 'Imposes criminal liability on the drawer of a dishonoured cheque, provided written notice is dispatched within 30 days of receiving the bank memo.',
    plain_meaning: 'If a cheque given to you bounces, send a formal 15-day demand notice. If they do not pay, you can file a criminal case within 30 days.',
    penalty_or_remedy: 'Imprisonment up to 2 years, or fine up to twice the amount of the cheque, or both.',
    jurisdiction: 'India (Central)',
    forum: 'Court of Judicial Magistrate First Class / Metropolitan Magistrate',
  },
  {
    id: 'law-rera-18',
    act_name: 'Real Estate (Regulation and Development) Act, 2016',
    section_number: 'Section 18',
    section_title: 'Return of amount and compensation',
    description: 'Mandates refund with statutory interest if developer fails to complete or give possession of apartment by agreed date.',
    plain_meaning: 'Homebuyers can demand 100% money back with interest or monthly penalty payments if possession is delayed beyond agreement date.',
    penalty_or_remedy: 'Full refund with SBI highest marginal lending rate + 2% interest, plus compensation.',
    jurisdiction: 'State RERA Authorities',
    forum: 'State Real Estate Regulatory Authority (RERA)',
  },
  {
    id: 'law-id-25f',
    act_name: 'Industrial Disputes Act, 1947',
    section_number: 'Section 25F',
    section_title: 'Conditions precedent to retrenchment of workmen',
    description: 'Requires employer to provide one month notice in writing indicating reasons for retrenchment or wages in lieu of notice, along with 15 days average pay per completed year.',
    plain_meaning: 'Employers cannot terminate employees without 30 days written notice or pay in lieu, plus statutory retrenchment compensation.',
    penalty_or_remedy: 'Reinstatement with full back wages and continuity of service.',
    jurisdiction: 'India (Central & States)',
    forum: 'Labour Court / Industrial Tribunal',
  },
];

// Precedent Case Database
const precedentCases = [
  {
    id: 'case-sc-imperia-2020',
    case_name: 'Imperia Structures Ltd. vs. Anil Patni & Anr.',
    court: 'Supreme Court of India',
    citation: '(2020) 10 SCC 783',
    judgment_date: '2020-11-02',
    jurisdiction: 'India',
    summary: 'Supreme Court held that remedies under Consumer Protection Act are additional and not barred by RERA remedies.',
    ratio_decidendi: 'Homebuyers can concurrently approach both the Consumer Court and RERA.',
  },
  {
    id: 'case-sc-pioneer-2019',
    case_name: 'Pioneer Urban Land & Infrastructure Ltd. vs. Govindan Raghavan',
    court: 'Supreme Court of India',
    citation: '(2019) 5 SCC 725',
    judgment_date: '2019-04-02',
    jurisdiction: 'India',
    summary: 'One-sided builder-buyer agreements constitute unfair trade practice under consumer law.',
    ratio_decidendi: 'Flat purchasers cannot be compelled to accept delayed possession when builder failed to deliver on time.',
  },
];

// Relationships between judgments
const caseRelationships = [
  {
    id: 1,
    source_case_id: 'case-sc-imperia-2020',
    target_case_id: 'case-sc-pioneer-2019',
    relationship_type: RELATIONSHIP_TYPES.FOLLOWS,
    description: 'Imperia Structures followed the principle in Pioneer Urban affirming buyer remedies against unilateral delay clauses.',
  },
];

export class LegalKnowledgeService {
  static getLaws(filter = {}) {
    let list = [...statutoryLaws];
    if (filter.actName) {
      list = list.filter((l) => l.act_name.toLowerCase().includes(filter.actName.toLowerCase()));
    }
    if (filter.section) {
      list = list.filter((l) => l.section_number.toLowerCase().includes(filter.section.toLowerCase()));
    }
    return list;
  }

  static getLawById(id) {
    return statutoryLaws.find((l) => l.id === id) || null;
  }

  static getPrecedents(filter = {}) {
    return precedentCases;
  }

  static getCaseRelationships(caseId) {
    return caseRelationships.filter(
      (r) => r.source_case_id === caseId || r.target_case_id === caseId
    );
  }

  static addCaseRelationship({ sourceCaseId, targetCaseId, relationshipType, description }) {
    if (!Object.values(RELATIONSHIP_TYPES).includes(relationshipType)) {
      throw new Error(`Invalid case relationship type: ${relationshipType}`);
    }

    const rel = {
      id: caseRelationships.length + 1,
      source_case_id: sourceCaseId,
      target_case_id: targetCaseId,
      relationship_type: relationshipType,
      description: description || '',
      created_at: new Date().toISOString(),
    };

    caseRelationships.push(rel);
    return rel;
  }
}
