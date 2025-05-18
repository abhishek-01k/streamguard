import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS, NETWORK_CONFIG, CURRENT_NETWORK, MOVE_CALLS } from '../constants/contracts';

// Initialize Sui client
export const suiClient = new SuiClient({
  url: NETWORK_CONFIG[CURRENT_NETWORK].RPC_URL,
});

// Utility function to create a transaction block
export function createTransaction() {
  return new Transaction();
}

// Stream Management Functions
export async function createStream(
  title: string,
  description: string,
  category: string,
  thumbnailWalrusId: string,
  qualityLevels: number[],
  isMonetized: boolean,
  subscriptionPrice: number,
  tipEnabled: boolean,
  contentRating: string,
  tags: string[],
  senderAddress: string
) {
  const tx = createTransaction();
  
  // Call the Move function and capture the returned Stream object
  const [stream] = tx.moveCall({
    target: MOVE_CALLS.CREATE_STREAM,
    arguments: [
      // StreamConfig fields (in order as defined in the struct)
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.string(category),
      tx.pure.string(thumbnailWalrusId),
      tx.pure.vector('u8', qualityLevels),
      tx.pure.bool(isMonetized),
      tx.pure.u64(subscriptionPrice),
      tx.pure.bool(tipEnabled),
      tx.pure.string(contentRating),
      tx.pure.vector('string', tags),
      // Registry and Clock objects
      tx.object(CONTRACTS.STREAM_REGISTRY),
      tx.object('0x6'), // Clock object
    ],
  });

  // Transfer the created stream to the sender (this resolves the UnusedValueWithoutDrop error)
  tx.transferObjects([stream], tx.pure.address(senderAddress));

  return tx;
}

// Utility function to validate Sui object IDs
export function isValidSuiObjectId(objectId: string): boolean {
  // Sui object IDs should be 64-character hex strings starting with 0x
  return /^0x[a-fA-F0-9]{64}$/.test(objectId);
}

export async function startStream(streamId: string, hlsManifestWalrusId: string) {
  // Validate the stream ID before using it
  if (!isValidSuiObjectId(streamId)) {
    throw new Error(`Invalid stream ID format: ${streamId}. Expected a 64-character hex string starting with 0x.`);
  }

  console.log('🔍 Starting stream with validated ID:', streamId);
  
  const tx = createTransaction();
  
  tx.moveCall({
    target: MOVE_CALLS.START_STREAM,
    arguments: [
      tx.object(streamId),
      tx.pure.string(hlsManifestWalrusId),
      tx.object(CONTRACTS.STREAM_REGISTRY),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

export async function endStream(streamId: string) {
  // Validate the stream ID before using it
  if (!isValidSuiObjectId(streamId)) {
    throw new Error(`Invalid stream ID format: ${streamId}. Expected a 64-character hex string starting with 0x.`);
  }

  console.log('🔍 Ending stream with validated ID:', streamId);
  
  const tx = createTransaction();
  
  tx.moveCall({
    target: MOVE_CALLS.END_STREAM,
    arguments: [
      tx.object(streamId),
      tx.object(CONTRACTS.STREAM_REGISTRY),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

export async function joinStream(streamId: string, senderAddress: string, payment?: string) {
  const tx = createTransaction();
  
  const args = [
    tx.object(streamId),
  ];

  if (payment) {
    args.push(tx.object(payment));
  }
  
  args.push(tx.object('0x6')); // Clock object

  // Call the Move function and capture the returned ViewerSession object
  const [session] = tx.moveCall({
    target: MOVE_CALLS.JOIN_STREAM,
    arguments: args,
  });

  // Transfer the created session to the sender
  tx.transferObjects([session], tx.pure.address(senderAddress));

  return tx;
}

// Creator Economy Functions
export async function createCreatorProfile() {
  const tx = createTransaction();
  
  tx.moveCall({
    target: MOVE_CALLS.CREATE_CREATOR_PROFILE,
    arguments: [],
  });

  return tx;
}

export async function sendTip(
  profileId: string,
  tipAmount: string,
  message: string,
  streamId?: string
) {
  const tx = createTransaction();
  
  // Split coin for tip
  const [tipCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(tipAmount)]);
  
  const args = [
    tx.object(profileId),
    tipCoin,
    tx.pure.string(message),
    streamId ? tx.pure.option('string', streamId) : tx.pure.option('string', null),
    tx.object(CONTRACTS.PLATFORM_TREASURY),
    tx.object('0x6'), // Clock object
  ];

  tx.moveCall({
    target: MOVE_CALLS.SEND_TIP,
    arguments: args,
  });

  return tx;
}

export async function subscribeToCreator(
  profileId: string,
  tierName: string,
  subscriptionAmount: string
) {
  const tx = createTransaction();
  
  // Split coin for subscription
  const [subscriptionCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(subscriptionAmount)]);
  
  tx.moveCall({
    target: MOVE_CALLS.SUBSCRIBE_TO_CREATOR,
    arguments: [
      tx.object(profileId),
      tx.pure.string(tierName),
      subscriptionCoin,
      tx.object(CONTRACTS.PLATFORM_TREASURY),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

// Content NFT Functions
export async function mintContentNFT(
  title: string,
  description: string,
  contentType: string,
  walrusBlobId: string,
  durationSeconds: number,
  royaltyBps: number = 1000
) {
  const tx = createTransaction();
  
  tx.moveCall({
    target: MOVE_CALLS.MINT_CONTENT_NFT,
    arguments: [
      tx.pure.string(title),
      tx.pure.string(description),
      tx.pure.string(contentType),
      tx.pure.string(walrusBlobId),
      tx.pure.option('string', null), // thumbnail_url
      tx.pure.u64(durationSeconds),
      tx.pure.u64(royaltyBps),
      tx.pure.vector('string', []), // metadata
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

export async function recordView(contentId: string, viewer: string) {
  const tx = createTransaction();
  
  tx.moveCall({
    target: MOVE_CALLS.RECORD_VIEW,
    arguments: [
      tx.object(contentId),
      tx.pure.address(viewer),
      tx.object('0x6'), // Clock object
    ],
  });

  return tx;
}

// Query Functions
export async function getStreamRegistry() {
  try {
    const result = await suiClient.getObject({
      id: CONTRACTS.STREAM_REGISTRY,
      options: {
        showContent: true,
        showType: true,
      },
    });
    return result;
  } catch (error) {
    console.error('Error fetching stream registry:', error);
    return null;
  }
}

export async function getCreatorProfile(profileId: string) {
  try {
    const result = await suiClient.getObject({
      id: profileId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    return result;
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    return null;
  }
}

export async function getStream(streamId: string) {
  try {
    const result = await suiClient.getObject({
      id: streamId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    return result;
  } catch (error) {
    console.error('Error fetching stream:', error);
    return null;
  }
}

// Event Listening
export async function subscribeToEvents(eventType: string, callback: (event: any) => void) {
  try {
    const unsubscribe = await suiClient.subscribeEvent({
      filter: {
        MoveEventType: eventType,
      },
      onMessage: callback,
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to events:', error);
    return null;
  }
}

// Get recent events
export async function getRecentEvents(eventType: string, limit: number = 50) {
  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: eventType,
      },
      limit,
      order: 'descending',
    });
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return null;
  }
}

// Utility function to format SUI amounts
export function formatSuiAmount(amount: string | number): string {
  const amountInSui = Number(amount) / 1_000_000_000; // Convert MIST to SUI
  return amountInSui.toFixed(4);
}

// Utility function to convert SUI to MIST
export function suiToMist(suiAmount: number): string {
  return (suiAmount * 1_000_000_000).toString();
}

// Get gas budget for transactions
export function getGasBudget(transactionType: 'simple' | 'complex' = 'simple'): string {
  return transactionType === 'complex' ? '50000000' : '10000000'; // 0.05 or 0.01 SUI
} 