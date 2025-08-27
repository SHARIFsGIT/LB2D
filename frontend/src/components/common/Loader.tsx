import React from 'react';

type LoaderSize = 'small' | 'medium' | 'large';

interface LoaderProps {
  size?: LoaderSize;
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * @param size
 * @param color
 * @param text
 * @param fullScreen
 */
const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  color = 'purple',
  text,
  fullScreen = false,
}) => {
  const sizeStyles = {
    small: 'h-8 w-8 border-2',
    medium: 'h-12 w-12 border-3',
    large: 'h-16 w-16 border-4',
  };

  const spinnerElement = (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`
          animate-spin rounded-full
          border-t-transparent
          ${sizeStyles[size]}
          border-${color}-600
        `}
        style={{
          borderTopColor: 'transparent',
          borderRightColor: `var(--color-${color}-600)`,
          borderBottomColor: `var(--color-${color}-600)`,
          borderLeftColor: `var(--color-${color}-600)`,
        }}
      />
      {text && (
        <p className={`mt-4 text-${color}-600 font-medium`}>{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default Loader;