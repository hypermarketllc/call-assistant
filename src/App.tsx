import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, MicOff, FileText, Minimize2, Maximize2, AlertCircle, CheckCircle2, Clock, Search, ChevronDown, ChevronUp, Settings, X, ArrowLeft, PhoneCall, PhoneOff } from 'lucide-react';
import { checklistItems, defaultScripts } from './config/callConfig';
import { useAudioService } from './services/audioService';
import { defaultAudioConfig } from './config/audioConfig';
import { GradingService } from './services/gradingService';
import { defaultGradingConfig } from './config/gradingConfig';
import { GradeCallModal } from './components/GradeCallModal';
import { ScriptEditor } from './components/ScriptEditor';

export function App() {
  // [Previous state declarations remain the same]
  const [scripts, setScripts] = useState(defaultScripts);
  const [selectedScriptId, setSelectedScriptId] = useState(defaultScripts[0].id);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 20 });
  const [size, setSize] = useState({ width: 384, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('script');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showObjections, setShowObjections] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState(
    checklistItems.map(item => ({ ...item, completed: false }))
  );
  const [checklist, setChecklist] = useState(checklistItems);
  const [apiConfig, setApiConfig] = useState(defaultAudioConfig);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAudioService, setCurrentAudioService] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [agentName, setAgentName] = useState('Agent');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  const currentScript = scripts.find(s => s.id === selectedScriptId) || scripts[0];
  const [objections, setObjections] = useState(currentScript.objections);

  const [callMetrics, setCallMetrics] = useState({
    talkRatio: 60,
    compliance: 95,
    duration: '00:00'
  });

  const { isListening, error, permissionStatus, startListening, stopListening } = useAudioService(apiConfig);

  const scriptRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeObjection, setActiveObjection] = useState<{
    category: string;
    objection: string;
    responses: string[];
    returnIndex: number;
  } | null>(null);

  useEffect(() => {
    const script = scripts.find(s => s.id === selectedScriptId);
    if (script) {
      setObjections(script.objections);
    }
  }, [selectedScriptId, scripts]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isResizing) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !isResizing) {
      const newX = Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - size.width));
      const newY = Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - size.height));
      
      setPosition({
        x: newX,
        y: newY
      });
    } else if (isResizing && resizeHandle) {
      e.preventDefault();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      
      if (resizeHandle.includes('left')) {
        newWidth = Math.max(300, size.width - deltaX);
        newX = position.x + (size.width - newWidth);
      } else if (resizeHandle.includes('right')) {
        newWidth = Math.max(300, size.width + deltaX);
      }
      
      if (resizeHandle.includes('bottom')) {
        newHeight = Math.max(400, size.height + deltaY);
      }
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: position.y });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleResizeStart = (e: React.MouseEvent, handle: 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // [Previous handlers remain the same]
  const handleStartCall = async () => {
    if (permissionStatus === 'denied') {
      setCurrentPrompt('Microphone access is required. Please enable it in your browser settings.');
      return;
    }

    try {
      setIsCallActive(true);
      setCallStartTime(new Date());
      setCurrentScriptIndex(0);
      setActiveChecklist(checklistItems.map(item => ({ ...item, completed: false })));
      setCallMetrics({
        talkRatio: 60,
        compliance: 95,
        duration: '00:00'
      });
      setIsMuted(false);
      
      const gradingService = new GradingService(defaultGradingConfig);
      await gradingService.initialize();
      
      const service = await startListening(
        gradingService,
        currentScript.content,
        currentScript.objections
      );
      setCurrentAudioService(service);
      setCurrentPrompt('');
    } catch (err) {
      setCurrentPrompt('Failed to start call. Please check microphone permissions.');
      setIsCallActive(false);
    }
  };

  const handleEndCall = async () => {
    setIsCallActive(false);
    if (currentAudioService) {
      stopListening(currentAudioService);
      
      try {
        const analysis = await currentAudioService.getCallAnalysis();
        if (analysis) {
          const { transcript, analysis: gradeAnalysis } = analysis;
          
          const gradingService = new GradingService(defaultGradingConfig);
          await gradingService.initialize();
          
          await gradingService.recordGrade({
            agentName,
            timestamp: new Date().toISOString(),
            callType: currentScript.name,
            duration: callMetrics.duration,
            grades: gradeAnalysis.grades,
            notes: gradeAnalysis.notes,
            transcription: transcript
          });

          setCurrentPrompt('Call graded and recorded successfully');
          setShowGradeModal(true);
        }
      } catch (error) {
        console.error('Failed to analyze call:', error);
        setCurrentPrompt('Failed to analyze call. Please check your configuration.');
      }
    }

    setCallStartTime(null);
    setCurrentScriptIndex(0);
    setActiveChecklist(checklistItems.map(item => ({ ...item, completed: false })));
    setActiveObjection(null);
    setCallMetrics({
      talkRatio: 60,
      compliance: 95,
      duration: '00:00'
    });
    setIsMuted(false);
    setCurrentAudioService(null);
  };

  const handleGradeSubmit = async (grades: any) => {
    try {
      const gradingService = new GradingService(defaultGradingConfig);
      await gradingService.initialize();
      
      await gradingService.recordGrade({
        agentName,
        timestamp: new Date().toISOString(),
        callType: currentScript.name,
        duration: callMetrics.duration,
        grades,
        notes: grades.notes,
        transcription: transcript
      });

      setCurrentPrompt('Grades recorded successfully');
    } catch (error) {
      console.error('Failed to record grades:', error);
      setCurrentPrompt('Failed to record grades. Please check your configuration.');
    }
  };

  const handleScriptSelect = (scriptId: string) => {
    if (!isCallActive) {
      setSelectedScriptId(scriptId);
      setCurrentScriptIndex(0);
      setActiveObjection(null);
    } else {
      setCurrentPrompt('Cannot change script during an active call');
    }
  };

  const handleScriptSave = (scriptId: string, updatedScript: typeof currentScript) => {
    setScripts(prev => prev.map(script => 
      script.id === scriptId ? { ...script, ...updatedScript } : script
    ));
    setEditingScriptId(null);
  };

  const handleChecklistUpload = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const items = event.target.value.split('\n')
        .filter(item => item.trim())
        .map((item, id) => ({ id: id + 1, text: item.trim() }));
      setChecklist(items);
      setActiveChecklist(items.map(item => ({ ...item, completed: false })));
    } catch (error) {
      alert('Invalid checklist format. Please enter one item per line.');
    }
  };

  const handleChecklistToggle = (id: number) => {
    setActiveChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleReturnToScript = () => {
    if (activeObjection) {
      setCurrentScriptIndex(activeObjection.returnIndex);
      setActiveObjection(null);
      
      if (scriptRef.current) {
        const paragraphs = scriptRef.current.getElementsByTagName('p');
        if (paragraphs[activeObjection.returnIndex]) {
          paragraphs[activeObjection.returnIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isListening) {
      stopListening(currentAudioService);
    } else if (isCallActive) {
      startListening();
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        handleMouseUp();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging || isResizing) {
        handleMouseMove(e as unknown as React.MouseEvent);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bg-white rounded-lg shadow-xl overflow-hidden"
        style={{
          top: position.y,
          left: position.x,
          width: isMinimized ? 256 : size.width,
          height: isMinimized ? 48 : size.height,
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Resize handles - always visible but only active when not minimized */}
        <div
          className={`absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/20 ${isMinimized ? 'pointer-events-none' : ''}`}
          onMouseDown={(e) => !isMinimized && handleResizeStart(e, 'left')}
        />
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/20 ${isMinimized ? 'pointer-events-none' : ''}`}
          onMouseDown={(e) => !isMinimized && handleResizeStart(e, 'right')}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/20 ${isMinimized ? 'pointer-events-none' : ''}`}
          onMouseDown={(e) => !isMinimized && handleResizeStart(e, 'bottom')}
        />
        <div
          className={`absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize hover:bg-blue-500/20 ${isMinimized ? 'pointer-events-none' : ''}`}
          onMouseDown={(e) => !isMinimized && handleResizeStart(e, 'bottom-left')}
        />
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-500/20 ${isMinimized ? 'pointer-events-none' : ''}`}
          onMouseDown={(e) => !isMinimized && handleResizeStart(e, 'bottom-right')}
        />

        <div className="bg-blue-600 p-4 cursor-move flex justify-between items-center">
          <div className="flex items-center text-white">
            <FileText className="w-5 h-5 mr-2" />
            <span className="font-semibold">Call Assistant</span>
          </div>
          <div className="flex items-center space-x-2">
            {!isCallActive ? (
              <>
                {!isMinimized && (
                  <select
                    className="text-sm bg-blue-500 text-white border border-blue-400 rounded px-2 py-1 mr-2"
                    value={selectedScriptId}
                    onChange={(e) => handleScriptSelect(e.target.value)}
                  >
                    {scripts.map(script => (
                      <option key={script.id} value={script.id}>
                        {script.name}
                      </option>
                    ))}
                  </select>
                )}
                <PhoneCall
                  className="w-5 h-5 text-white cursor-pointer hover:text-blue-200"
                  onClick={handleStartCall}
                />
              </>
            ) : (
              <>
                <PhoneOff
                  className="w-5 h-5 text-white cursor-pointer hover:text-blue-200"
                  onClick={handleEndCall}
                />
                {isMuted ? (
                  <MicOff
                    className="w-5 h-5 text-red-300 cursor-pointer hover:text-red-200"
                    onClick={toggleMute}
                  />
                ) : (
                  <Mic
                    className="w-5 h-5 text-white cursor-pointer hover:text-blue-200"
                    onClick={toggleMute}
                  />
                )}
              </>
            )}
            {!isMinimized && (
              <Settings 
                className="w-5 h-5 text-white cursor-pointer hover:text-blue-200" 
                onClick={() => setShowSettings(true)}
              />
            )}
            {isMinimized ? (
              <Maximize2 
                className="w-5 h-5 text-white cursor-pointer hover:text-blue-200" 
                onClick={() => setIsMinimized(false)} 
              />
            ) : (
              <Minimize2 
                className="w-5 h-5 text-white cursor-pointer hover:text-blue-200" 
                onClick={() => setIsMinimized(true)} 
              />
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="bg-gray-100 p-2 flex justify-between items-center text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1 text-gray-600" />
                <span>{callMetrics.duration}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-4">Talk Ratio: {callMetrics.talkRatio}%</span>
                <span>Compliance: {callMetrics.compliance}%</span>
              </div>
            </div>

            <div className="flex border-b">
              <button
                className={`flex-1 py-2 px-4 ${activeTab === 'script' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('script')}
              >
                Script
              </button>
              <button
                className={`flex-1 py-2 px-4 ${activeTab === 'checklist' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('checklist')}
              >
                Checklist
              </button>
              <button
                className={`flex-1 py-2 px-4 ${activeTab === 'objections' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('objections')}
              >
                Objections
              </button>
            </div>

            <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 160px)' }}>
              {activeTab === 'script' && (
                <>
                  {activeObjection ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleReturnToScript}
                          className="flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Return to Script
                        </button>
                        <span className="text-sm text-gray-500">Handling Objection</span>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-medium text-yellow-800 mb-2">
                          Customer Objection: "{activeObjection.objection}"
                        </h3>
                        <div className="space-y-3">
                          {activeObjection.responses.map((response, index) => (
                            <p key={index} className="text-gray-700 bg-white p-3 rounded border border-yellow-200">
                              {response}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div ref={scriptRef} className="space-y-4 text-gray-700">
                      {currentScript.content.split('\n\n').map((paragraph, index) => (
                        <p
                          key={index}
                          className={`p-2 rounded ${
                            currentScriptIndex === index
                              ? 'bg-blue-100 border-l-4 border-blue-600'
                              : ''
                          }`}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'checklist' && (
                <div className="space-y-2">
                  {activeChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                      onClick={() => handleChecklistToggle(item.id)}
                    >
                      <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center cursor-pointer
                        ${item.completed ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                      >
                        {item.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'objections' && (
                <div className="space-y-4">
                  {Object.entries(objections).map(([category, objectionList]) => (
                    <div key={category} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-3 font-medium text-gray-700 capitalize">
                        {category}
                      </div>
                      <div className="divide-y">
                        {Object.entries(objectionList).map(([objection, responses]) => (
                          <div key={objection} className="p-3 hover:bg-gray-50">
                            <h4 className="font-medium text-gray-800 mb-2">"{objection}"</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                              {(responses as string[]).map((response, index) => (
                                <li key={index}>{response}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentPrompt && (
              <div className="p-4 bg-yellow-50 border-t">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">{currentPrompt}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-t">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[800px] max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Configuration Settings</h2>
                <div className="flex items-center space-x-2">
                  <button
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    onClick={() => setShowApiConfig(true)}
                  >
                    API Keys
                  </button>
                  <X 
                    className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-700"
                    onClick={() => setShowSettings(false)}
                  />
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Script Management</h3>
                  <div className="space-y-4">
                    {scripts.map(script => (
                      <div key={script.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-3 flex justify-between items-center">
                          <h4 className="font-medium">{script.name}</h4>
                          <button
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                            onClick={() => setEditingScriptId(script.id)}
                          >
                            Edit Script
                          </button>
                        </div>
                        {editingScriptId === script.id && (
                          <div className="p-4">
                            <ScriptEditor
                              script={script}
                              onSave={(updatedScript) => handleScriptSave(script.id, updatedScript)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Checklist Items</h3>
                  <p className="text-sm text-gray-600 mb-2">Enter one item per line</p>
                  <textarea
                    className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter checklist items (one per line)..."
                    defaultValue={checklist.map(item => item.text).join('\n')}
                    onChange={handleChecklistUpload}
                  />
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => setShowSettings(false)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showApiConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[500px]">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">API Configuration</h2>
                <X 
                  className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => setShowApiConfig(false)}
                />
              </div>
              <form 
                className="p-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowApiConfig(false);
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dialer API Key
                  </label>
                  <input
                    type="password"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={apiConfig.dialerApiKey}
                    onChange={(e) => setApiConfig(prev => ({ ...prev, dialerApiKey: e.target.value }))}
                    placeholder="Enter your dialer API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speech-to-Text API Key
                  </label>
                  <input
                    type="password"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={apiConfig.sttApiKey}
                    onChange={(e) => setApiConfig(prev => ({ ...prev, sttApiKey: e.target.value }))}
                    placeholder="Enter your Speech-to-Text API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WebSocket URL
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={apiConfig.websocketUrl}
                    onChange={(e) => setApiConfig(prev => ({ ...prev, websocketUrl: e.target.value }))}
                    placeholder="Enter your WebSocket server URL"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    onClick={() => setShowApiConfig(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <GradeCallModal
          isOpen={showGradeModal}
          onClose={() => setShowGradeModal(false)}
          onSubmit={handleGradeSubmit}
          duration={callMetrics.duration }
        />
      </div>
    </>
  );
}