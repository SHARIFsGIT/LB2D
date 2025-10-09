import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * @param label
 * @param error
 * @param helperText
 * @param icon
 * @param fullWidth
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, fullWidth = true, className = '', ...props }, ref) => {
    const inputClassName = `
      block px-3 py-2 
      border rounded-lg 
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
      transition-colors duration-200
      ${error ? 'border-red-500' : 'border-gray-300'}
      ${icon ? 'pl-10' : ''}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Icon */}
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">{icon}</span>
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            className={inputClassName}
            aria-invalid={!!error}
            aria-describedby={error ? 'error-message' : helperText ? 'helper-text' : undefined}
            {...props}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p id="error-message" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p id="helper-text" className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;