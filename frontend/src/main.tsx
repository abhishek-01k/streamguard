// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mysten/dapp-kit/dist/index.css';
import '@radix-ui/themes/styles.css';
import './index.css'; // Tailwind CSS
import './App.css'; // Custom app styles

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { NETWORK_CONFIG, CURRENT_NETWORK } from './constants/contracts';

const queryClient = new QueryClient();

// Network configuration for Sui dApp Kit
const networkConfig = {
  testnet: { url: NETWORK_CONFIG.TESTNET.RPC_URL },
  mainnet: { url: NETWORK_CONFIG.MAINNET.RPC_URL },
};

// Ensure network name matches the expected type
const defaultNetwork = CURRENT_NETWORK.toLowerCase() as 'testnet' | 'mainnet';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme appearance="dark">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
          <WalletProvider autoConnect>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>,
); 