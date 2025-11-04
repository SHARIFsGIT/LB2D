import CryptoJS from 'crypto-js';

export interface DeviceFingerprint {
  fingerprint: string;
  userAgent: string;
  deviceName: string;
}

/**
 * Generate a unique device fingerprint based on browser and device characteristics
 */
export const generateDeviceFingerprint = (): DeviceFingerprint => {
  const components: string[] = [];

  // User Agent
  const userAgent = navigator.userAgent;
  components.push(userAgent);

  // Screen resolution
  components.push(`${window.screen.width}x${window.screen.height}`);
  components.push(`${window.screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Platform
  components.push(navigator.platform);

  // Language
  components.push(navigator.language);

  // Hardware concurrency (CPU cores)
  components.push(`${navigator.hardwareConcurrency || 'unknown'}`);

  // Device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory) {
    components.push(`${deviceMemory}GB`);
  }

  // Touch support
  components.push(`${navigator.maxTouchPoints || 0}`);

  // Pixel ratio
  components.push(`${window.devicePixelRatio}`);

  // Create hash from all components
  const componentString = components.join('|');
  const fingerprint = CryptoJS.SHA256(componentString).toString();

  // Generate human-readable device name
  const deviceName = getDeviceName(userAgent);

  return {
    fingerprint,
    userAgent,
    deviceName
  };
};

/**
 * Extract human-readable device name from user agent
 */
const getDeviceName = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android')) {
    if (ua.includes('samsung')) return 'Samsung Mobile';
    if (ua.includes('huawei')) return 'Huawei Mobile';
    if (ua.includes('xiaomi')) return 'Xiaomi Mobile';
    if (ua.includes('oppo')) return 'Oppo Mobile';
    if (ua.includes('vivo')) return 'Vivo Mobile';
    if (ua.includes('oneplus')) return 'OnePlus Mobile';
    return 'Android Device';
  }

  // Tablets
  if (ua.includes('tablet')) return 'Tablet';

  // Desktop OS
  if (ua.includes('windows')) {
    if (ua.includes('edg')) return 'Windows PC (Edge)';
    if (ua.includes('chrome')) return 'Windows PC (Chrome)';
    if (ua.includes('firefox')) return 'Windows PC (Firefox)';
    return 'Windows PC';
  }

  if (ua.includes('macintosh') || ua.includes('mac os')) {
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Mac (Safari)';
    if (ua.includes('chrome')) return 'Mac (Chrome)';
    if (ua.includes('firefox')) return 'Mac (Firefox)';
    return 'Mac';
  }

  if (ua.includes('linux')) {
    if (ua.includes('chrome')) return 'Linux PC (Chrome)';
    if (ua.includes('firefox')) return 'Linux PC (Firefox)';
    return 'Linux PC';
  }

  // Default
  return 'Unknown Device';
};

/**
 * Store device fingerprint in localStorage for consistency
 */
export const getStoredFingerprint = (): DeviceFingerprint | null => {
  try {
    const stored = localStorage.getItem('deviceFingerprint');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored fingerprint:', error);
  }
  return null;
};

/**
 * Store device fingerprint in localStorage
 */
export const storeFingerprint = (fingerprint: DeviceFingerprint): void => {
  try {
    localStorage.setItem('deviceFingerprint', JSON.stringify(fingerprint));
  } catch (error) {
    console.error('Error storing fingerprint:', error);
  }
};

/**
 * Get or generate device fingerprint
 */
export const getDeviceFingerprint = (): DeviceFingerprint => {
  // Try to get stored fingerprint first (for consistency)
  const stored = getStoredFingerprint();
  if (stored) {
    return stored;
  }

  // Generate new fingerprint
  const fingerprint = generateDeviceFingerprint();
  storeFingerprint(fingerprint);
  return fingerprint;
};
