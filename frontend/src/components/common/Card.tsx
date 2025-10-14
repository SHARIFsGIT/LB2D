import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * @param title
 * @param subtitle
 * @param children
 * @param headerAction
 * @param footer
 * @param padding
 */
const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerAction,
  footer,
  padding = 'medium',
}) => {
  const paddingStyles = {
    none: '',
    small: 'p-3 sm:p-4',
    medium: 'p-4 sm:p-6',
    large: 'p-6 sm:p-8',
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Card Header */}
      {(title || subtitle || headerAction) && (
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className={paddingStyles[padding]}>{children}</div>

      {/* Card Footer */}
      {footer && (
        <div className="border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;