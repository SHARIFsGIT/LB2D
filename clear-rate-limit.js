/**
 * Utility script to clear rate limiting for development
 * Run this if you get blocked by rate limiting during development
 */

console.log('🚀 Rate Limit Clear Script');
console.log('⚠️  Note: This only affects client-side. Server rate limits are in-memory.');
console.log('');

// Clear any local storage items that might be related
if (typeof localStorage !== 'undefined') {
  localStorage.clear();
  console.log('✅ Cleared localStorage');
}

if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear();
  console.log('✅ Cleared sessionStorage');
}

// Clear browser cache programmatically (if running in browser context)
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  }).then(() => {
    console.log('✅ Cleared browser cache');
  });
}

console.log('');
console.log('🔄 To fully clear server-side rate limits:');
console.log('   1. Restart your backend server');
console.log('   2. Or wait 2-15 minutes for limits to expire');
console.log('');
console.log('✨ Rate limiting has been made more lenient in the latest update!');