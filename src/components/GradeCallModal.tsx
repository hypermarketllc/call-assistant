import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GradeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (grades: {
    tone: number;
    onScript: number;
    presentation: number;
    objectionHandling: number;
    speaking: number;
    overall: number;
    notes: string;
  }) => void;
  duration: string;
}

export function GradeCallModal({ isOpen, onClose, onSubmit, duration }: GradeCallModalProps) {
  const [grades, setGrades] = useState({
    tone: 5,
    onScript: 5,
    presentation: 5,
    objectionHandling: 5,
    speaking: 5,
    overall: 5,
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(grades);
    onClose();
  };

  const handleGradeChange = (category: keyof typeof grades, value: number | string) => {
    setGrades(prev => ({
      ...prev,
      [category]: typeof value === 'string' ? value : Math.max(1, Math.min(10, value))
    }));
  };

  const renderGradeInput = (label: string, category: keyof typeof grades) => {
    if (category === 'notes') return null;
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} (1-10)
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="1"
            max="10"
            value={grades[category] as number}
            onChange={(e) => handleGradeChange(category, parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="w-8 text-center font-medium">{grades[category]}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Grade Call Performance</h2>
          <X
            className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-700"
            onClick={onClose}
          />
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="mb-6 text-sm text-gray-500">
            Call Duration: {duration}
          </div>
          
          {renderGradeInput('Tone', 'tone')}
          {renderGradeInput('Script Adherence', 'onScript')}
          {renderGradeInput('Presentation', 'presentation')}
          {renderGradeInput('Objection Handling', 'objectionHandling')}
          {renderGradeInput('Speaking Quality', 'speaking')}
          {renderGradeInput('Overall Rating', 'overall')}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={grades.notes}
              onChange={(e) => handleGradeChange('notes', e.target.value)}
              className="w-full h-32 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional notes about the call performance..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit Grades
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}