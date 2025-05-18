// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Header from './components/common/Header';
import HomePage from './pages/HomePage';
import CreateStreamPage from './pages/CreateStreamPage';
import StreamPage from './pages/StreamPage';
import StreamDashboardPage from './pages/StreamDashboardPage';
import CategoryPage from './pages/CategoryPage';

// Styles
import './App.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateStreamPage />} />
          <Route path="/stream/:streamId" element={<StreamPage />} />
          <Route path="/stream/live" element={<StreamDashboardPage />} />
          <Route path="/dashboard" element={<StreamDashboardPage />} />
          <Route path="/browse" element={<HomePage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
        </Routes>
      </main>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
          },
        }}
      />
    </div>
  );
};

export default App; 