import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hemi, hemiSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'Hemi Tattoos',
  projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [hemiSepolia, hemi], // Sepolia first as default
  ssr: false,
});
