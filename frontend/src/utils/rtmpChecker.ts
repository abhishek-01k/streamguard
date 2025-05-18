// RTMP Connection Checker Utility
// This utility checks if OBS is connected to the RTMP server by querying the SRS API

export interface RTMPConnectionStatus {
  isConnected: boolean;
  streamKey?: string;
  bitrate?: number;
  fps?: number;
  resolution?: string;
  clientCount?: number;
  uptime?: number;
  serverRunning?: boolean;
}

export class RTMPChecker {
  private srsApiUrl: string;
  
  constructor(srsApiUrl: string = 'http://localhost:1985/api/v1') {
    this.srsApiUrl = srsApiUrl;
  }

  async checkConnection(streamKey: string): Promise<RTMPConnectionStatus> {
    try {
      console.log(`🔍 Checking RTMP connection for stream key: ${streamKey}`);
      
      // First check if SRS server is running
      const serverRunning = await this.isServerRunning();
      if (!serverRunning) {
        console.log('❌ SRS server is not running');
        return { isConnected: false, serverRunning: false };
      }
      
      console.log('✅ SRS server is running');

      // Check for active streams
      const streamsResponse = await fetch(`${this.srsApiUrl}/streams/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!streamsResponse.ok) {
        console.log(`⚠️ Streams API returned status: ${streamsResponse.status}`);
        return { isConnected: false, serverRunning: true };
      }

      const streamsData = await streamsResponse.json();
      console.log('📊 Streams data:', streamsData);
      
      if (streamsData.code !== 0) {
        console.log(`⚠️ Streams API returned error code: ${streamsData.code}`);
        return { isConnected: false, serverRunning: true };
      }

      // Look for our specific stream key in active streams
      const streams = streamsData.streams || [];
      console.log(`🔍 Found ${streams.length} active streams`);
      
      const ourStream = streams.find((stream: any) => {
        const matches = stream.name === streamKey || 
                       stream.stream === streamKey ||
                       stream.url?.includes(streamKey) ||
                       (stream.app === 'live' && stream.stream === streamKey) ||
                       stream.name?.includes(streamKey) ||
                       stream.app?.includes(streamKey);
        
        if (matches) {
          console.log('✅ Found matching stream:', stream);
        }
        return matches;
      });

      if (ourStream) {
        // Extract bitrate properly from kbps object or direct value
        let bitrate = 0;
        if (ourStream.kbps && typeof ourStream.kbps === 'object') {
          // kbps is an object like {recv_30s: 0, send_30s: 0}
          bitrate = Math.max(
            ourStream.kbps.recv_30s || 0, 
            ourStream.kbps.send_30s || 0
          );
        } else if (typeof ourStream.kbps === 'number') {
          bitrate = ourStream.kbps;
        } else if (ourStream.video?.bitrate) {
          bitrate = ourStream.video.bitrate;
        }

        const connectionStatus = {
          isConnected: true,
          serverRunning: true,
          streamKey,
          bitrate: Math.round(bitrate),
          fps: ourStream.video?.fps || 30,
          resolution: ourStream.video ? `${ourStream.video.width}x${ourStream.video.height}` : '1920x1080',
          clientCount: ourStream.clients || 1,
          uptime: ourStream.live_ms ? Math.floor((Date.now() - ourStream.live_ms) / 1000) : 0,
        };
        
        console.log('🎉 Stream is connected:', connectionStatus);
        return connectionStatus;
      }

      // Alternative check: look for any active clients/publishers
      console.log('🔍 Checking clients API...');
      const clientsResponse = await fetch(`${this.srsApiUrl}/clients`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        console.log('👥 Clients data:', clientsData);
        
        if (clientsData.code === 0) {
          const clients = clientsData.clients || [];
          console.log(`🔍 Found ${clients.length} active clients`);
          
          // Check if there's a publisher with our stream key
          const publisher = clients.find((client: any) => {
            const matches = client.type === 'publish' && 
                           (client.stream === streamKey || 
                            client.url?.includes(streamKey) ||
                            (client.app === 'live' && client.stream === streamKey));
            
            if (matches) {
              console.log('✅ Found matching publisher:', client);
            }
            return matches;
          });

          if (publisher) {
            const connectionStatus = {
              isConnected: true,
              serverRunning: true,
              streamKey,
              bitrate: publisher.send_bytes ? Math.round(publisher.send_bytes / 1024 / 8) : 0, // Convert to kbps
              fps: 30, // Default FPS
              resolution: '1920x1080', // Default resolution
              clientCount: 1,
              uptime: publisher.alive || 0,
            };
            
            console.log('🎉 Publisher is connected:', connectionStatus);
            return connectionStatus;
          }
        }
      }

      console.log('❌ No matching stream or publisher found');
      return { isConnected: false, serverRunning: true };
    } catch (error) {
      console.error('💥 Error checking RTMP connection:', error);
      return { isConnected: false, serverRunning: false };
    }
  }

  async getServerStats() {
    try {
      const response = await fetch(`${this.srsApiUrl}/summaries`);
      if (response.ok) {
        const data = await response.json();
        return data.code === 0 ? data : null;
      }
    } catch (error) {
      console.error('Error getting server stats:', error);
    }
    return null;
  }

  // Check if SRS server is running
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.srsApiUrl}/summaries`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        const isRunning = data.code === 0;
        console.log(`🔧 SRS server status: ${isRunning ? 'running' : 'error'}`);
        return isRunning;
      }
      
      console.log(`🔧 SRS server returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.error('🔧 Error checking server status:', error);
      return false;
    }
  }
}

export const rtmpChecker = new RTMPChecker(); 