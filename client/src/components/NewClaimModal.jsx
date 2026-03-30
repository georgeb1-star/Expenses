import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileText } from 'lucide-react';

export function NewClaimModal({ onConfirm, onCancel }) {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    await onConfirm(title.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
            <FileText className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">New Expense Claim</h2>
            <p className="text-xs text-gray-500 mt-0.5">Give your claim a descriptive title</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700" htmlFor="claim-title">
              Claim title
            </label>
            <Input
              id="claim-title"
              ref={inputRef}
              placeholder='e.g. "March Travel Expenses"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim() || creating}>
              {creating ? 'Creating…' : 'Create Claim'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
