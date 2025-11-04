import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'grid' | 'text' | 'avatar' | 'banner';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const baseAnimation = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

  const variants = {
    card: (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className={`h-48 ${baseAnimation} rounded-lg mb-4`} />
        <div className={`h-6 ${baseAnimation} rounded mb-3 w-3/4`} />
        <div className={`h-4 ${baseAnimation} rounded mb-2 w-full`} />
        <div className={`h-4 ${baseAnimation} rounded w-5/6`} />
      </div>
    ),
    list: (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${baseAnimation} rounded-full flex-shrink-0`} />
          <div className="flex-1">
            <div className={`h-5 ${baseAnimation} rounded mb-2 w-1/2`} />
            <div className={`h-4 ${baseAnimation} rounded w-3/4`} />
          </div>
        </div>
      </div>
    ),
    grid: (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {skeletons.map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className={`h-32 ${baseAnimation} rounded-lg mb-4`} />
            <div className={`h-5 ${baseAnimation} rounded mb-2`} />
            <div className={`h-4 ${baseAnimation} rounded`} />
          </div>
        ))}
      </div>
    ),
    text: (
      <div className={`space-y-3 ${className}`}>
        {skeletons.map((i) => (
          <div key={i} className={`h-4 ${baseAnimation} rounded w-full`} />
        ))}
      </div>
    ),
    avatar: (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`w-10 h-10 ${baseAnimation} rounded-full`} />
        <div className="flex-1">
          <div className={`h-4 ${baseAnimation} rounded w-1/3 mb-2`} />
          <div className={`h-3 ${baseAnimation} rounded w-1/4`} />
        </div>
      </div>
    ),
    banner: (
      <div className={`${baseAnimation} h-64 rounded-lg ${className}`} />
    ),
  };

  if (variant === 'grid') {
    return variants[variant];
  }

  return (
    <>
      {skeletons.map((i) => (
        <React.Fragment key={i}>
          {variants[variant]}
        </React.Fragment>
      ))}
    </>
  );
};

export default LoadingSkeleton;
