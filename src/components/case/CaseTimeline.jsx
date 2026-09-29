import React from 'react';
import { formatDate } from '../../utils/formatDate';
import { Check, Clock, Circle } from 'lucide-react';
import './CaseTimeline.css';

export function CaseTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return <p className="timeline-empty">No milestone events recorded yet.</p>;
  }

  return (
    <div className="case-timeline">
      {events.map((ev, index) => {
        const isCompleted = ev.status === 'completed';
        const isCurrent = ev.status === 'current';
        const isUpcoming = ev.status === 'upcoming';

        return (
          <div
            key={index}
            className={`timeline-step ${isCompleted ? 'step-done' : ''} ${isCurrent ? 'step-active' : ''} ${isUpcoming ? 'step-pending' : ''}`}
          >
            <div className="timeline-marker">
              <div className="marker-dot">
                {isCompleted && <Check size={12} />}
                {isCurrent && <Clock size={12} />}
                {isUpcoming && <Circle size={10} />}
              </div>
              {index < events.length - 1 && <div className="timeline-stem" />}
            </div>

            <div className="timeline-info">
              <div className="timeline-title-row">
                <strong className="event-name">{ev.event}</strong>
                <span className="event-date">{formatDate(ev.date)}</span>
              </div>
              {ev.note && <p className="event-note">{ev.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
