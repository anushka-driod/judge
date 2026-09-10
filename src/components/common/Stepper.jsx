import React from 'react';
import { Check } from 'lucide-react';
import './Stepper.css';

export function Stepper({ steps = [], activeStep = 0, className = '' }) {
  return (
    <div className={`stepper-container ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < activeStep;
        const isCurrent = index === activeStep;

        return (
          <React.Fragment key={step.title || index}>
            <div className={`stepper-step ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-current' : ''}`}>
              <div className="step-circle">
                {isCompleted ? <Check size={14} /> : <span>{index + 1}</span>}
              </div>
              <div className="step-label-group">
                <span className="step-title">{step.title}</span>
                {step.subtitle && <span className="step-subtitle">{step.subtitle}</span>}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`stepper-line ${isCompleted ? 'line-completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
