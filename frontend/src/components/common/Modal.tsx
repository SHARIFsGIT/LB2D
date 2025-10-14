import React, { useEffect } from 'react';

type ModalSize = 'small' | 'medium' | 'large' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

/**
 * @param isOpen
 * @param onClose
 * @param title
 * @param size
 * @param footer
 * @param closeOnOverlayClick 
 * @param showCloseButton
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  footer,
  closeOnOverlayClick = true,
  showCloseButton = true,
}) => {
  const sizeStyles = {
    small: 'max-w-[90vw] sm:max-w-md',
    medium: 'max-w-[90vw] sm:max-w-lg',
    large: 'max-w-[95vw] sm:max-w-2xl',
    xl: 'max-w-[95vw] sm:max-w-4xl',
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <div
          className={`relative bg-white rounded-lg sm:rounded-xl shadow-xl w-full ${sizeStyles[size]} transform transition-all max-h-[95vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              {title && (
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4 truncate">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end p-4 sm:p-6 border-t border-gray-200 space-x-2 flex-shrink-0 flex-wrap gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;