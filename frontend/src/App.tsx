// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Box, Button, Card, Container, Flex, Grid } from '@radix-ui/themes';
import { CreateAllowlist } from './CreateAllowlist';
import { Allowlist } from './Allowlist';
import WalrusUpload from './EncryptAndUpload';
import { useState } from 'react';
import { CreateService } from './CreateSubscriptionService';
import FeedsToSubscribe from './SubscriptionView';
import { Service } from './SubscriptionService';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AllAllowlist } from './OwnedAllowlists';
import { AllServices } from './OwnedSubscriptionServices';
import Feeds from './AllowlistView';
import HomePage from './pages/HomePage';
import StreamPage from './pages/StreamPage';
import { CreateStreamPage } from './pages/CreateStreamPage';
import './App.css';

function SealExamplesPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Seal Example Apps</h2>
      <Grid columns="2" gap="4">
        <Card>
          <Flex direction="column" gap="2" align="center" style={{ height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h3>Allowlist Example</h3>
              <p>
                Shows how a creator can define an allowlist based access. The creator first creates an
                allowlist and can add or remove users in the list. The creator can then associate
                encrypted files to the allowlist. Only users in the allowlist have access to decrypt
                the files.
              </p>
            </div>
            <Link to="/allowlist-example">
              <Button size="3">Try it</Button>
            </Link>
          </Flex>
        </Card>
        <Card>
          <Flex direction="column" gap="2" align="center" style={{ height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h3>Subscription Example</h3>
              <p>
                Shows how a creator can define a subscription based access to its published files. The
                creator defines subcription fee and how long a subscription is valid for. The creator
                can then associate encrypted files to the service. Only users who have purchased a
                subscription (NFT) have access to decrypt the files, along with the condition that the
                subscription must not have expired (i.e. the subscription creation timestamp plus the
                TTL is smaller than the current clock time).
              </p>
            </div>
            <Link to="/subscription-example">
              <Button size="3">Try it</Button>
            </Link>
          </Flex>
        </Card>
      </Grid>
    </div>
  );
}

function App() {
  const currentAccount = useCurrentAccount();
  const [recipientAllowlist, setRecipientAllowlist] = useState<string>('');
  const [capId, setCapId] = useState<string>('');
  return (
    <Router>
      <div className="App">
        <Container>
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🎬</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">StreamGuard</h1>
                  <p className="text-xs text-gray-400">Decentralized Live Streaming</p>
                </div>
              </Link>
              
              <div className="flex items-center space-x-4">
                <Link 
                  to="/create-stream"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Streaming
                </Link>
                <ConnectButton />
              </div>
            </div>
          </header>
          {currentAccount ? (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/stream/:streamId" element={<StreamPage />} />
              <Route path="/seal-examples" element={<SealExamplesPage />} />
              <Route path="/allowlist-example/*" element={
                <Routes>
                  <Route path="/" element={<CreateAllowlist />} />
                  <Route
                    path="/admin/allowlist/:id"
                    element={
                      <div>
                        <Allowlist
                          setRecipientAllowlist={setRecipientAllowlist}
                          setCapId={setCapId}
                        />
                        <WalrusUpload
                          policyObject={recipientAllowlist}
                          cap_id={capId}
                          moduleName="allowlist"
                        />
                      </div>
                    }
                  />
                  <Route path="/admin/allowlists" element={<AllAllowlist />} />
                  <Route
                    path="/view/allowlist/:id"
                    element={<Feeds suiAddress={currentAccount.address} />}
                  />
                </Routes>
              } />
              <Route path="/subscription-example/*" element={
                <Routes>
                  <Route path="/" element={<CreateService />} />
                  <Route
                    path="/admin/service/:id"
                    element={
                      <div>
                        <Service
                          setRecipientAllowlist={setRecipientAllowlist}
                          setCapId={setCapId}
                        />
                        <WalrusUpload
                          policyObject={recipientAllowlist}
                          cap_id={capId}
                          moduleName="subscription"
                        />
                      </div>
                    }
                  />
                  <Route path="/admin/services" element={<AllServices />} />
                  <Route
                    path="/view/service/:id"
                    element={<FeedsToSubscribe suiAddress={currentAccount.address} />}
                  />
                </Routes>
              } />
              <Route path="/create-stream" element={<CreateStreamPage />} />
            </Routes>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔗</div>
              <div className="text-white text-2xl mb-4">Welcome to StreamGuard</div>
              <div className="text-gray-400 mb-6">
                Please connect your wallet to access the decentralized streaming platform
              </div>
              <ConnectButton />
            </div>
          )}
        </Container>
      </div>
    </Router>
  );
}

export default App;
