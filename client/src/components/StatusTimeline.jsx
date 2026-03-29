import React from 'react';
import { cn, STATUS_STEPS, STATUS_LABELS } from '../lib/utils';
import { Check } from 'lucide-react';

export function StatusTimeline({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STATUS_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;

          return (
            <React.Fragment key={step}>
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors',
                    done && 'bg-green-500 border-green-500',
                    active && 'bg-blue-600 border-blue-600',
                    !done && !active && 'bg-white border-gray-300'
                  )}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] whitespace-nowrap font-medium',
                    done && 'text-green-600',
                    active && 'text-blue-700',
                    !done && !active && 'text-gray-400'
                  )}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-10 mx-1 mb-5 flex-shrink-0',
                    i < currentIdx ? 'bg-green-400' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
