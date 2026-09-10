/**
 * Reminder & Follow-Up Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Tracks critical legal dates:
 * - Statutory limitation periods (e.g. 30 days for Section 138, 2 years for CPA)
 * - 15-day statutory notice cure windows
 * - Lawyer consultation appointments
 * - Court hearing dates
 * - Document submission milestones
 */

const remindersStore = [];

export const REMINDER_TYPES = {
  APPOINTMENT: 'appointment',
  STATUTORY_LIMITATION: 'statutory_limitation',
  NOTICE_CURE_PERIOD: 'notice_cure_period',
  DOCUMENT_DEADLINE: 'document_deadline',
  HEARING_DATE: 'hearing_date',
  FOLLOW_UP: 'follow_up',
};

export class ReminderService {
  static createReminder({ userId, caseId, title, description, reminderDate, reminderType }) {
    if (!userId || !title || !reminderDate) {
      throw new Error('User ID, reminder title, and reminder date/time are required.');
    }

    const reminder = {
      id: `rem-${Date.now()}-${remindersStore.length + 1}`,
      user_id: userId,
      case_id: caseId || null,
      title,
      description: description || '',
      reminder_date: new Date(reminderDate).toISOString(),
      reminder_type: reminderType || REMINDER_TYPES.FOLLOW_UP,
      is_triggered: false,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    remindersStore.push(reminder);
    return reminder;
  }

  static getRemindersForUser(userId) {
    return remindersStore.filter((r) => r.user_id === userId && r.status === 'active');
  }

  static getRemindersForCase(caseId) {
    return remindersStore.filter((r) => r.case_id === caseId);
  }

  static dismissReminder(reminderId) {
    const rem = remindersStore.find((r) => r.id === reminderId);
    if (!rem) {
      throw new Error(`Reminder ${reminderId} not found`);
    }
    rem.status = 'dismissed';
    return rem;
  }
}
