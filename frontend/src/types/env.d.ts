/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALRUS_PUBLISHER_URL: string
  readonly VITE_WALRUS_AGGREGATOR_URL: string
  readonly VITE_RTMP_SERVER_URL: string
  readonly VITE_RTMP_SERVER_HOST: string
  readonly VITE_RTMP_SERVER_PORT: string
  readonly VITE_SUI_NETWORK: string
  readonly VITE_SUI_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 