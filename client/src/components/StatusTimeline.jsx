import React from 'react';
import { cn, STATUS_STEPS, STATUS_LABELS } from '../lib/utils';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export function StatusTimeline({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-max py-2">
        {STATUS_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const upcoming = i > currentIdx;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full',
                  done && 'bg-green-500 text-white',
                  active && 'bg-primary text-white',
                  upcoming && 'bg-gray-200 text-gray-400'
                )}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> :
                   active ? <Clock className="w-5 h-5" /> :
                   <Circle className="w-5 h-5" />}
                </div>
                <span className={cn(
                  'mt-1 text-xs whitespace-nowrap',
                  done && 'text-green-600 font-medium',
                  active && 'text-primary font-semibold',
                  upcoming && 'text-gray-400'
                )}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 w-12 mx-1 mb-4',
                  i < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
