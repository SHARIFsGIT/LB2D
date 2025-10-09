import React from 'react';

interface PaymentFallbackProps {
  message?: string;
}

const PaymentFallback: React.FC<PaymentFallbackProps> = ({ 
  message = "Payment system is currently unavailable. Please try again later." 
}) => {
  return (
    <div className="text-center py-12">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
        <div className="text-yellow-600 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Payment System Unavailable
        </h3>
        <p className="text-yellow-700 text-sm mb-4">
          {message}
        </p>
        <div className="text-xs text-yellow-600">
          <p>Please ensure:</p>
          <ul className="list-disc text-left mt-2 ml-4">
            <li>Stripe API keys are configured</li>
            <li>Environment variables are set</li>
            <li>Network connection is stable</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentFallback;