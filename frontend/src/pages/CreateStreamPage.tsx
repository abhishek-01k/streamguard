import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Button, Card, Text, TextField } from '@radix-ui/themes';
import { Stream, StreamStatus, QualityLevel } from '../types/stream';
import { useStreamStore } from '../stores/streamStore';
import { createStream } from '../lib/sui';
import { walrusStorage, uploadThumbnail } from '../lib/walrus';
import { PLATFORM_CONSTANTS, RTMP_CONFIG, CONTRACTS } from '../constants/contracts';
import { toast } from 'react-hot-toast';
import { Upload, Camera, Video, Settings } from 'lucide-react';

const CATEGORIES = [
  'Gaming',
  'Technology',
  'Education',
  'Music',
  'Art',
  'Sports',
  'Entertainment',
  'News',
  'Lifestyle',
  'Science',
];

export const CreateStreamPage: React.FC = () => {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { addStream } = useStreamStore();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Gaming',
    isMonetized: false,
    subscriptionPrice: 0,
    tipEnabled: true,
    contentRating: 'General' as 'General' | 'Teen' | 'Mature',
    tags: '',
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [streamKey, setStreamKey] = useState<string>('');
  const [rtmpUrl, setRtmpUrl] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailBlobId, setThumbnailBlobId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateStreamKey = () => {
    return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Debug utility to analyze transaction results
  const analyzeTransactionResult = (result: any) => {
    console.log('🔍 TRANSACTION ANALYSIS START');
    console.log('📋 Result keys:', Object.keys(result));
    console.log('📋 Result structure:', {
      digest: result.digest,
      effects: typeof result.effects,
      objectChanges: Array.isArray((result as any).objectChanges) ? (result as any).objectChanges.length : 'not array',
      balanceChanges: Array.isArray((result as any).balanceChanges) ? (result as any).balanceChanges.length : 'not array',
    });
    
    if ((result as any).objectChanges) {
      console.log('📦 Object Changes Analysis:');
      (result as any).objectChanges.forEach((change: any, index: number) => {
        console.log(`  [${index}] Type: ${change.type}, ObjectType: ${change.objectType}, ObjectId: ${change.objectId}`);
      });
    }
    
    if (result.effects && typeof result.effects === 'object') {
      const effects = result.effects as any;
      console.log('⚡ Effects Analysis:');
      console.log('  Created:', effects.created?.length || 0);
      console.log('  Mutated:', effects.mutated?.length || 0);
      console.log('  Deleted:', effects.deleted?.length || 0);
      
      if (effects.created) {
        effects.created.forEach((obj: any, index: number) => {
          console.log(`  Created[${index}]:`, obj);
        });
      }
    }
    
    console.log('🔍 TRANSACTION ANALYSIS END');
  };

  const handleCreateStream = async () => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a stream title');
      return;
    }

    setIsCreating(true);

    try {
      // Verify contract addresses before proceeding
      console.log('🔍 Verifying contract configuration...');
      console.log('Package ID:', CONTRACTS.PACKAGE_ID);
      console.log('Stream Registry:', CONTRACTS.STREAM_REGISTRY);
      console.log('Create Stream Target:', `${CONTRACTS.PACKAGE_ID}::${CONTRACTS.MODULES.STREAM_MANAGER}::create_stream_with_params`);

      // Generate stream key and RTMP URL
      const newStreamKey = generateStreamKey();
      const newRtmpUrl = `${RTMP_CONFIG.SERVER_URL}/${newStreamKey}`;
      
      setStreamKey(newStreamKey);
      setRtmpUrl(newRtmpUrl);

      // Upload thumbnail to Walrus if provided
      let thumbnailWalrusId = '';
      if (thumbnailFile) {
        try {
          thumbnailWalrusId = await uploadThumbnail(thumbnailFile);
          setThumbnailBlobId(thumbnailWalrusId);
        } catch (error) {
          console.error('Failed to upload thumbnail:', error);
          // Continue without thumbnail
        }
      }

      // Store stream metadata on Walrus
      const metadata = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        creator: currentAccount.address,
        thumbnailBlobId: thumbnailWalrusId,
        quality: '1080p',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        contentRating: formData.contentRating,
        isMonetized: formData.isMonetized,
        subscriptionPrice: formData.isMonetized ? formData.subscriptionPrice * 1000000000 : 0, // Convert to MIST
        tipEnabled: formData.tipEnabled,
        streamKey: newStreamKey,
        rtmpUrl: newRtmpUrl,
      };

      const metadataBlobId = await walrusStorage.storeStreamMetadata(metadata);

      // Create initial HLS manifest (empty for now)
      const initialManifest = walrusStorage.createHLSManifest([]);
      const manifestBlobId = await walrusStorage.storeManifest(initialManifest, newStreamKey);

      // Create stream on Sui blockchain
      const tx = await createStream(
        formData.title,
        formData.description,
        formData.category,
        thumbnailWalrusId || 'default_thumbnail',
        [2, 3], // Quality levels: 720p, 1080p
        formData.isMonetized,
        formData.isMonetized ? formData.subscriptionPrice * 1000000000 : 0, // Convert to MIST
        formData.tipEnabled,
        formData.contentRating,
        formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        currentAccount.address
      );

      // Execute transaction
      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx },
          {
            onSuccess: async (result) => {
              console.log('Stream created on blockchain:', result);
              console.log('Full transaction result:', JSON.stringify(result, null, 2));
              
              // Use debug utility to analyze the transaction result
              analyzeTransactionResult(result);
              
              // Extract stream ID from transaction result - get the actual object ID
              let streamId = '';
              
              try {
                console.log('🔍 Extracting stream ID from transaction result...');
                console.log('Transaction digest:', result.digest);
                
                // First try to extract from the direct result if it has objectChanges
                let transactionData = result;
                
                // Check if the result already has objectChanges (from our options)
                if ((result as any).objectChanges && Array.isArray((result as any).objectChanges)) {
                  console.log('🎉 Found objectChanges in direct result:', (result as any).objectChanges.length);
                  transactionData = result;
                } else {
                  // If not, wait for the transaction to be indexed and then fetch
                  console.log('🔍 No objectChanges in direct result, waiting for transaction to be indexed...');
                  
                  try {
                    // Wait for the transaction to be fully processed and indexed
                    await suiClient.waitForTransaction({
                      digest: result.digest,
                      options: {
                        showObjectChanges: true,
                        showEvents: true,
                        showEffects: true,
                      }
                    });
                    console.log('✅ Transaction indexed successfully');
                    
                    // Now fetch the full transaction details
                    const fullTransactionResult = await suiClient.getTransactionBlock({
                      digest: result.digest,
                      options: {
                        showObjectChanges: true,
                        showEvents: true,
                        showEffects: true,
                        showInput: false,
                        showRawInput: false,
                        showBalanceChanges: false
                      }
                    });
                    
                    console.log('📦 Full transaction result from client:', JSON.stringify(fullTransactionResult, null, 2));
                    transactionData = fullTransactionResult as any;
                  } catch (waitError) {
                    console.error('❌ Failed to wait for transaction or fetch details:', waitError);
                    throw new Error(`Transaction indexing failed: ${waitError instanceof Error ? waitError.message : 'Unknown error'}`);
                  }
                }
                
                // Now extract from the transaction data (either direct result or fetched result)
                if ((transactionData as any).objectChanges && Array.isArray((transactionData as any).objectChanges)) {
                  console.log('🔍 Found objectChanges in transaction data:', (transactionData as any).objectChanges.length);
                  
                  // Log all object changes for debugging
                  (transactionData as any).objectChanges.forEach((change: any, index: number) => {
                    console.log(`📦 ObjectChange[${index}]:`, {
                      type: change.type,
                      objectType: (change as any).objectType,
                      objectId: (change as any).objectId,
                      version: (change as any).version,
                      digest: (change as any).digest,
                      sender: (change as any).sender,
                      owner: (change as any).owner
                    });
                  });
                  
                  // Look for created objects first
                  const createdObjects = (transactionData as any).objectChanges.filter((change: any) => 
                    change.type === 'created'
                  );
                  
                  console.log('📦 Created objects count:', createdObjects.length);
                  
                  // Method 1: Look for the Stream object specifically by type
                  const streamObject = createdObjects.find((change: any) => {
                    const objectType = (change as any).objectType || '';
                    console.log(`🔍 Checking object type: "${objectType}"`);
                    
                    // Check if this is a Stream object from our package
                    const isStreamObject = objectType.includes('stream_manager::Stream') || 
                           objectType.includes('::Stream') ||
                           (objectType.includes(CONTRACTS.PACKAGE_ID) && objectType.includes('Stream'));
                    
                    console.log(`  - Is Stream object: ${isStreamObject}`);
                    return isStreamObject;
                  });
                  
                  if (streamObject && (streamObject as any).objectId) {
                    streamId = (streamObject as any).objectId;
                    console.log('✅ METHOD 1 SUCCESS: Found stream object ID in objectChanges:', streamId);
                  } else {
                    console.log('⚠️ METHOD 1: No Stream object found in objectChanges');
                    
                    // Method 2: Look for any created object that matches our pattern
                    // The stream object should be the main object created (not registry or clock)
                    const unknownObject = createdObjects.find((change: any) => {
                      const objId = (change as any).objectId;
                      const isValidFormat = objId && objId.startsWith('0x') && objId.length === 66;
                      const isNotSystemObject = objId !== CONTRACTS.STREAM_REGISTRY && 
                                               objId !== '0x0000000000000000000000000000000000000000000000000000000000000006';
                      
                      console.log(`  - Checking object ${objId}: validFormat=${isValidFormat}, notSystem=${isNotSystemObject}`);
                      
                      return isValidFormat && isNotSystemObject;
                    });
                    
                    if (unknownObject) {
                      streamId = (unknownObject as any).objectId;
                      console.log('✅ METHOD 2 SUCCESS: Found potential stream object ID:', streamId);
                    } else {
                      console.log('❌ METHOD 2: No suitable objects found');
                      
                      // Method 3: Check for transferred objects (since Stream might be transferred to sender)
                      const transferredObjects = (transactionData as any).objectChanges.filter((change: any) => 
                        change.type === 'transferred'
                      );
                      
                      console.log('📦 Transferred objects count:', transferredObjects.length);
                      
                      const transferredStream = transferredObjects.find((change: any) => {
                        const objectType = (change as any).objectType || '';
                        const isStreamObject = objectType.includes('stream_manager::Stream') || 
                               objectType.includes('::Stream') ||
                               (objectType.includes(CONTRACTS.PACKAGE_ID) && objectType.includes('Stream'));
                        
                        console.log(`  - Checking transferred object type "${objectType}": isStream=${isStreamObject}`);
                        return isStreamObject;
                      });
                      
                      if (transferredStream && (transferredStream as any).objectId) {
                        streamId = (transferredStream as any).objectId;
                        console.log('✅ METHOD 3 SUCCESS: Found transferred stream object ID:', streamId);
                      }
                    }
                  }
                }
                
                // Method 4: Check events for StreamCreated event
                if (!streamId && (transactionData as any).events && Array.isArray((transactionData as any).events)) {
                  console.log('🔍 METHOD 4: Looking for StreamCreated events...');
                  
                  const events = (transactionData as any).events;
                  console.log('📦 Events count:', events.length);
                  
                  events.forEach((event: any, index: number) => {
                    console.log(`📦 Event[${index}]:`, {
                      type: event.type,
                      packageId: event.packageId,
                      transactionModule: event.transactionModule,
                      sender: event.sender,
                      parsedJson: event.parsedJson
                    });
                  });
                  
                  // Look for StreamCreated event
                  const streamCreatedEvent = events.find((event: any) => {
                    const eventType = event.type || '';
                    return eventType.includes('StreamCreated') || 
                           eventType.includes('stream_manager::StreamCreated') ||
                           (event.parsedJson && (event.parsedJson as any).stream_id);
                  });
                  
                  if (streamCreatedEvent && streamCreatedEvent.parsedJson && (streamCreatedEvent.parsedJson as any).stream_id) {
                    streamId = (streamCreatedEvent.parsedJson as any).stream_id;
                    console.log('✅ METHOD 4 SUCCESS: Found stream ID in StreamCreated event:', streamId);
                  } else {
                    console.log('❌ METHOD 4: No StreamCreated event found');
                  }
                }
                
                // Final validation
                if (streamId) {
                  // Validate that it's a proper Sui object ID (hex string starting with 0x, exactly 66 chars)
                  const isValidObjectId = /^0x[a-fA-F0-9]{64}$/.test(streamId);
                  if (!isValidObjectId) {
                    console.error('❌ Invalid stream ID format:', streamId);
                    console.error('❌ Stream ID length:', streamId.length);
                    console.error('❌ Stream ID pattern test:', /^0x[a-fA-F0-9]{64}$/.test(streamId));
                    throw new Error(`Invalid stream ID format: ${streamId}. Expected a 64-character hex string starting with 0x.`);
                  }
                  
                  console.log('✅ Stream ID validation passed:', streamId);
                } else {
                  console.error('❌ CRITICAL: Failed to extract stream ID from transaction result');
                  console.log('📋 Available data for debugging:');
                  console.log('  - Transaction digest:', result.digest);
                  console.log('  - Transaction data objectChanges:', (transactionData as any).objectChanges?.length || 0);
                  console.log('  - Transaction data events:', (transactionData as any).events?.length || 0);
                  
                  // Log the complete result one more time for manual inspection
                  console.log('📋 COMPLETE TRANSACTION DATA FOR MANUAL INSPECTION:');
                  console.log(transactionData);
                  
                  throw new Error('Failed to extract stream ID from blockchain transaction. The stream may have been created but we cannot retrieve its ID.');
                }
                
              } catch (extractionError) {
                console.error('❌ Stream ID extraction failed:', extractionError);
                throw new Error(`Failed to extract stream ID: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`);
              }
              
              // Create the stream object with the extracted ID
              const newStream: Stream = {
                id: streamId,
                creator: currentAccount.address,
                title: formData.title,
                description: formData.description,
                category: formData.category,
                thumbnailWalrusId: thumbnailWalrusId || 'default_thumbnail',
                hlsManifestWalrusId: manifestBlobId || '',
                status: StreamStatus.CREATED,
                createdAt: Date.now(),
                startedAt: 0,
                endedAt: 0,
                viewerCount: 0,
                totalRevenue: 0,
                qualityLevels: [QualityLevel.QUALITY_720P, QualityLevel.QUALITY_1080P],
                isMonetized: formData.isMonetized,
                subscriptionPrice: formData.isMonetized ? formData.subscriptionPrice * 1000000000 : 0, // Convert to MIST
                tipEnabled: formData.tipEnabled,
                moderationScore: 100,
                contentRating: formData.contentRating,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
                metadataBlobId: metadataBlobId || '',
                streamKey: newStreamKey || '',
                rtmpUrl: newRtmpUrl || `rtmp://localhost:1935/live/${newStreamKey}`,
              };
              
              console.log('📊 Created stream object:', newStream);
              
              // Add to store
              addStream(newStream);
              console.log('✅ Stream added to store');
              
              // Show success message
              toast.success('🎉 Stream created successfully!');
              
              // Small delay to ensure store is updated before navigation
              setTimeout(() => {
                console.log('🧭 Navigating to dashboard with key:', newStreamKey);
                // Navigate to stream dashboard
                navigate(`/dashboard?key=${newStreamKey}`);
              }, 100);
            },
            onError: (error) => {
              console.error('Failed to create stream on blockchain:', error);
              reject(error);
            },
          }
        );
      });

    } catch (error) {
      console.error('Failed to create stream:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to create stream';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to extract stream ID')) {
          errorMessage = 'Stream creation failed: Could not get stream ID from blockchain. Please try again.';
          toast.error(errorMessage);
        } else if (error.message.includes('Invalid input')) {
          errorMessage = 'Stream creation failed: Invalid transaction data. Please check your inputs and try again.';
          toast.error(errorMessage);
        } else if (error.message.includes('Insufficient gas')) {
          errorMessage = 'Stream creation failed: Insufficient gas. Please ensure you have enough SUI for transaction fees.';
          toast.error(errorMessage);
        } else {
          errorMessage = `Stream creation failed: ${error.message}`;
          toast.error(errorMessage);
        }
      } else {
        errorMessage = 'Stream creation failed: Unknown error occurred. Please try again.';
        toast.error(errorMessage);
      }
      
      console.error('Error details:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Thumbnail file size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      setThumbnailFile(file);
      console.log('Thumbnail file selected:', file.name);
    }
  };

  const handleStartStreaming = () => {
    if (streamKey) {
      // Navigate to the stream page where they can go live
      navigate(`/stream/live?key=${streamKey}`);
    }
  };

  if (!currentAccount) {
    return (
      <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md mx-auto p-6 text-center">
          <Text size="5" weight="bold" className="mb-4 block">
            Connect Wallet Required
          </Text>
          <Text className="mb-4 block text-gray-400">
            Please connect your wallet to create a live stream.
          </Text>
          <Button onClick={() => navigate('/')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Live Stream</h1>
          <p className="text-gray-400">Set up your live stream on the Sui blockchain with Walrus storage</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stream Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Stream Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stream Title *
                </label>
                <TextField.Root
                  placeholder="Enter your stream title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe what your stream is about..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma separated)
                </label>
                <TextField.Root
                  placeholder="gaming, tutorial, live"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thumbnail {thumbnailFile && <span className="text-green-400">✓ {thumbnailFile.name}</span>}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {thumbnailFile ? 'Change Thumbnail' : 'Upload Thumbnail'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG recommended</p>
              </div>
            </div>
          </Card>

          {/* Monetization Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Monetization</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="monetized"
                  checked={formData.isMonetized}
                  onChange={(e) => handleInputChange('isMonetized', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="monetized" className="text-sm font-medium text-gray-300">
                  Enable Subscriptions
                </label>
              </div>

              {formData.isMonetized && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subscription Price (SUI)
                  </label>
                  <TextField.Root
                    type="number"
                    placeholder="0.001"
                    step="0.001"
                    min={PLATFORM_CONSTANTS.MIN_SUBSCRIPTION_AMOUNT / 1000000000}
                    value={formData.subscriptionPrice}
                    onChange={(e) => handleInputChange('subscriptionPrice', parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: {PLATFORM_CONSTANTS.MIN_SUBSCRIPTION_AMOUNT / 1000000000} SUI
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="tips"
                  checked={formData.tipEnabled}
                  onChange={(e) => handleInputChange('tipEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="tips" className="text-sm font-medium text-gray-300">
                  Enable Tips (Min: {PLATFORM_CONSTANTS.MIN_TIP_AMOUNT / 1000000000} SUI)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content Rating
                </label>
                <select
                  value={formData.contentRating}
                  onChange={(e) => handleInputChange('contentRating', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General">General</option>
                  <option value="Teen">Teen</option>
                  <option value="Mature">Mature</option>
                </select>
              </div>

              <div className="p-4 bg-blue-900 bg-opacity-30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>💰 Platform Fee:</strong> {PLATFORM_CONSTANTS.PLATFORM_FEE_BPS / 100}% on all transactions
                </p>
              </div>
            </div>

            {/* Stream Key Section */}
            {streamKey && (
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Stream Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      RTMP URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={rtmpUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                      />
                      <Button
                        onClick={() => navigator.clipboard.writeText(rtmpUrl)}
                        className="rounded-l-none"
                        size="2"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Stream Key
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={streamKey}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white text-sm"
                      />
                      <Button
                        onClick={() => navigator.clipboard.writeText(streamKey)}
                        className="rounded-l-none"
                        size="2"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button
                    onClick={handleStartStreaming}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="3"
                  >
                    Go to Stream Dashboard
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            size="3"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateStream}
            disabled={isCreating || !formData.title.trim()}
            size="3"
          >
            {isCreating ? 'Creating on Blockchain...' : 'Create Stream'}
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How to Start Streaming</h3>
          <div className="space-y-3 text-gray-300">
            <p>1. <strong>Create your stream</strong> using the form above (stored on Sui blockchain)</p>
            <p>2. <strong>Copy the RTMP URL and Stream Key</strong> that will be generated</p>
            <p>3. <strong>Configure your streaming software</strong> (OBS, Streamlabs, etc.) with these credentials</p>
            <p>4. <strong>Start streaming</strong> from your software (video stored on Walrus)</p>
            <p>5. <strong>Go live</strong> and earn SUI tokens from your audience!</p>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-900 bg-opacity-30 rounded-lg">
            <h4 className="text-yellow-300 font-semibold mb-2">⚠️ RTMP Server Required</h4>
            <p className="text-yellow-200 text-sm mb-3">
              You need to run an RTMP server locally for development. The default configuration expects a server at <code>localhost:1935</code>.
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-yellow-200">
                <strong>Quick Setup with Docker:</strong>
              </p>
              <code className="block bg-gray-800 p-2 rounded text-green-400 text-xs">
                docker run --rm -it -p 1935:1935 -p 8080:8080 ossrs/srs:5
              </code>
              <p className="text-yellow-200 mt-2">
                See <code>RTMP_SETUP.md</code> for detailed setup instructions and troubleshooting.
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-900 bg-opacity-30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>🚀 Powered by Sui + Walrus:</strong> Your stream metadata is stored on Sui blockchain for transparency, 
              while video content is stored on Walrus for decentralized, cost-effective streaming.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateStreamPage; 