import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileText, Bookmark, X, CheckCircle2 } from 'lucide-react';
import { claimsApi, templatesApi } from '../api';

export function NewClaimModal({ onSuccess, onCancel }) {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    templatesApi.list().then((r) => setTemplates(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const { data: claim } = await claimsApi.create({
        title: title.trim(),
        template_id: selectedTemplate?.id ?? null,
      });
      onSuccess(claim.id);
    } catch {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    await templatesApi.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
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

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-gray-400" />
                Start from a template
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {templates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(isSelected ? null : t)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded border text-left transition-colors ${
                        isSelected
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          : <Bookmark className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        }
                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-red-800' : 'text-gray-800'}`}>
                          {t.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {t.items?.length ?? 0} item{(t.items?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                        <span
                          role="button"
                          onClick={(e) => handleDeleteTemplate(e, t.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
                          title="Delete template"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
