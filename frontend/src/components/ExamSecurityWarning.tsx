import React, { useEffect, useState } from 'react';
import { Button, Modal } from './common';

interface ExamSecurityWarningProps {
  violations: string[];
  onAcknowledge: () => void;
  maxViolations?: number;
  onMaxViolationsExceeded?: () => void;
}

const ExamSecurityWarning: React.FC<ExamSecurityWarningProps> = ({
  violations,
  onAcknowledge,
  maxViolations = 3,
  onMaxViolationsExceeded,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  const getViolationMessage = (type: string): string => {
    const messages: Record<string, string> = {
      'right-click': 'Right-click is disabled during the exam',
      'copy': 'Copying content is not allowed during the exam',
      'print': 'Printing is disabled during the exam',
      'devtools': 'Developer tools are not allowed during the exam',
      'tab-switch': 'Switching tabs/windows is not allowed during the exam',
      'screenshot': 'Taking screenshots is not allowed during the exam',
      'f12': 'F12 key is disabled during the exam',
      'view-source': 'Viewing page source is not allowed during the exam',
      'save': 'Saving page content is not allowed during the exam',
    };
    return messages[type] || 'Security violation detected';
  };

  useEffect(() => {
    if (violations.length > 0) {
      setViolationCount(prev => {
        const newCount = prev + violations.length;
        
        if (newCount >= maxViolations && onMaxViolationsExceeded) {
          onMaxViolationsExceeded();
        }
        
        return newCount;
      });
      setShowWarning(true);
    }
  }, [violations, maxViolations, onMaxViolationsExceeded]);

  const handleAcknowledge = () => {
    setShowWarning(false);
    onAcknowledge();
  };

  const remainingAttempts = Math.max(0, maxViolations - violationCount);
  const isLastWarning = remainingAttempts === 1;
  const isExceeded = remainingAttempts === 0;

  return (
    <Modal
      isOpen={showWarning}
      onClose={handleAcknowledge}
      title="Security Warning"
      size="small"
      closeOnOverlayClick={false}
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Violation Messages */}
        <div className="space-y-2">
          {violations.map((violation, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 text-red-600"
            >
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">{getViolationMessage(violation)}</span>
            </div>
          ))}
        </div>

        {/* Warning Count */}
        <div className={`p-3 rounded-lg ${isExceeded ? 'bg-red-100' : isLastWarning ? 'bg-yellow-100' : 'bg-gray-100'}`}>
          <p className={`text-sm font-medium ${isExceeded ? 'text-red-800' : isLastWarning ? 'text-yellow-800' : 'text-gray-800'}`}>
            {isExceeded ? (
              'Maximum violations exceeded. Your test will be terminated.'
            ) : isLastWarning ? (
              `Final Warning: You have ${remainingAttempts} attempt remaining`
            ) : (
              `Warning ${violationCount} of ${maxViolations}: You have ${remainingAttempts} attempts remaining`
            )}
          </p>
        </div>

        {/* Security Rules */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Exam Security Rules:
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Do not switch tabs or windows</li>
            <li>• Do not use developer tools</li>
            <li>• Do not copy or print content</li>
            <li>• Do not take screenshots</li>
            <li>• Stay in fullscreen mode</li>
          </ul>
        </div>

        {/* Acknowledge Button */}
        <Button
          onClick={handleAcknowledge}
          variant={isExceeded ? 'danger' : 'warning'}
          fullWidth
        >
          {isExceeded ? 'Exit Test' : 'I Understand'}
        </Button>
      </div>
    </Modal>
  );
};

export default ExamSecurityWarning;