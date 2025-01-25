import React, { useState } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Script } from '../config/callConfig';

interface ScriptEditorProps {
  script: Script;
  onSave: (scriptId: string, updatedScript: Script) => void;
  onClose: () => void;
}

export function ScriptEditor({ script, onSave, onClose }: ScriptEditorProps) {
  const [content, setContent] = useState(script.content);
  const [objections, setObjections] = useState(script.objections);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newObjection, setNewObjection] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSave = () => {
    onSave(script.id, {
      ...script,
      content,
      objections
    });
  };

  const handleAddCategory = () => {
    if (newCategory && !objections[newCategory]) {
      setObjections(prev => ({
        ...prev,
        [newCategory]: {}
      }));
      setNewCategory('');
      setExpandedCategory(newCategory);
    }
  };

  const handleAddObjection = (category: string) => {
    if (newObjection) {
      setObjections(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [newObjection]: []
        }
      }));
      setNewObjection('');
      setSelectedCategory(category);
    }
  };

  const handleAddResponse = (category: string, objection: string) => {
    if (newResponse) {
      setObjections(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [objection]: [...(prev[category][objection] || []), newResponse]
        }
      }));
      setNewResponse('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    const { [category]: _, ...rest } = objections;
    setObjections(rest);
  };

  const handleRemoveObjection = (category: string, objection: string) => {
    const categoryObjections = { ...objections[category] };
    delete categoryObjections[objection];
    setObjections(prev => ({
      ...prev,
      [category]: categoryObjections
    }));
  };

  const handleRemoveResponse = (category: string, objection: string, index: number) => {
    setObjections(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [objection]: prev[category][objection].filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Script</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Script Content</h3>
            <textarea
              className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your script content..."
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Objection Handling</h3>
            
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="New category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button
                onClick={handleAddCategory}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(objections).map(([category, objectionList]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedCategory === category ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <h4 className="font-medium text-gray-700 capitalize">{category}</h4>
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedCategory === category && (
                    <div className="p-3 space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="New objection..."
                          value={newObjection}
                          onChange={(e) => setNewObjection(e.target.value)}
                        />
                        <button
                          onClick={() => handleAddObjection(category)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {Object.entries(objectionList).map(([objection, responses]) => (
                        <div key={objection} className="pl-4 border-l-2 border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-800">"{objection}"</h5>
                            <button
                              onClick={() => handleRemoveObjection(category, objection)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2 mb-3">
                            {responses.map((response, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <p className="flex-1 text-sm text-gray-600">{response}</p>
                                <button
                                  onClick={() => handleRemoveResponse(category, objection, index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              className="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Add response..."
                              value={newResponse}
                              onChange={(e) => setNewResponse(e.target.value)}
                            />
                            <button
                              onClick={() => handleAddResponse(category, objection)}
                              className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}