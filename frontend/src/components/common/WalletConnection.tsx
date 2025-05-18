import React from 'react';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { LogOut, User } from 'lucide-react';

const WalletConnection: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (!currentAccount) {
    return (
      <div className="flex items-center space-x-2">
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block">
          <div className="text-sm text-white font-medium">
            {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
          </div>
          <div className="text-xs text-gray-400">Connected</div>
        </div>
      </div>
      
      <button
        onClick={() => disconnect()}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        title="Disconnect Wallet"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};

export default WalletConnection;

export function WalletBalance() {
  const currentAccount = useCurrentAccount();

  if (!currentAccount) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-400">
      <span>Balance:</span>
      <span className="text-white font-medium">-- SUI</span>
    </div>
  );
} 