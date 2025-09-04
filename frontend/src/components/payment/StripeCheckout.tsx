import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement,
} from '@stripe/react-stripe-js';
import { useNotification } from '../../hooks/useNotification';

interface StripeCheckoutProps {
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  courseName: string;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  amount,
  currency,
  onSuccess,
  onError,
  courseName,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showSuccess, showError } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);

  // Don't render if Stripe hasn't loaded yet
  if (!stripe || !elements) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading secure payment form...</p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment error:', error);
        showError(error.message || 'Payment failed', 'Payment Error');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        showSuccess(
          `Payment successful! You are now enrolled in ${courseName}`,
          'Payment Completed',
          { duration: 5000 }
        );
        onSuccess(paymentIntent.id);
      } else {
        showError('Payment was not completed', 'Payment Error');
        onError('Payment was not completed');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      showError(
        error.message || 'An unexpected error occurred',
        'Payment Error'
      );
      onError(error.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Professional Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Payment</h2>
        <p className="text-gray-600">Complete your enrollment with our secure payment system</p>
      </div>

      {/* Course Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">{courseName}</h3>
            <p className="text-xs text-gray-600">German Language Course</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/50">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium text-sm">Total Amount</span>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {amount.toFixed(2)} {currency.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500">One-time payment</div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Payment Method Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
            </div>
          </div>
          <div className="p-6">
            <PaymentElement
              options={{
                layout: 'tabs',
              }}
            />
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
            </div>
          </div>
          <div className="p-6">
            <AddressElement
              options={{
                mode: 'billing',
                allowedCountries: ['DE', 'US', 'BD', 'IN', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT'],
                fields: {
                  phone: 'always',
                },
                validation: {
                  phone: {
                    required: 'never',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Professional Payment Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!stripe || !elements || isProcessing}
            className={`w-full py-4 px-8 rounded-2xl font-bold text-lg ${
              isProcessing
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                <span>Processing Your Payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Complete Payment • {amount.toFixed(2)} {currency.toUpperCase()}</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StripeCheckout;