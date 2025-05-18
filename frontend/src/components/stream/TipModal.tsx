import React, { useState } from 'react';
import { X, Gift, DollarSign } from 'lucide-react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTip: (amount: number, message: string) => void;
  creatorName: string;
}

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, onTip, creatorName }) => {
  const [amount, setAmount] = useState<string>('1');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedAmounts = [0.1, 0.5, 1, 5, 10, 25];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tipAmount = parseFloat(amount);
    if (tipAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onTip(tipAmount, message);
      setAmount('1');
      setMessage('');
    } catch (error) {
      console.error('Tip failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Gift className="w-5 h-5 mr-2 text-yellow-400" />
            Send Tip
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 text-sm">
            Send a tip to <span className="font-semibold text-white">{creatorName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Predefined Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick amounts (SUI)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {predefinedAmounts.map((preAmount) => (
                <button
                  key={preAmount}
                  type="button"
                  onClick={() => setAmount(preAmount.toString())}
                  className={`p-2 rounded-lg border transition-colors ${
                    amount === preAmount.toString()
                      ? 'border-purple-500 bg-purple-600 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preAmount} SUI
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom amount (SUI)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.001"
                step="0.001"
                required
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Say something nice..."
            />
            <div className="text-xs text-gray-500 mt-1">
              {message.length}/200 characters
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              {isSubmitting ? 'Sending...' : `Tip ${amount} SUI`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TipModal; 