/**
 * VidhiSetu Network Connectivity & Offline Mode Manager
 *
 * Provides:
 * - Real-time detection of internet availability (online vs offline)
 * - Immediate zero-wait bypassing of external APIs (Gemini LLM, Indian Kanoon) when offline
 * - Instant fallback to local authentic legal knowledge base and curated precedents
 * - Manual OFFLINE_MODE toggle via env or runtime API
 */

import dns from 'dns';

class NetworkManager {
  constructor() {
    this.forcedOffline = process.env.OFFLINE_MODE === 'true';
    this._isOnline = !this.forcedOffline;
    this._lastChecked = 0;
    this._checkInterval = 30000; // 30s cache interval
    this._checkingPromise = null;
  }

  /**
   * Returns current online status.
   * If forced offline or no internet detected, returns false.
   */
  isOnline() {
    if (this.forcedOffline) return false;
    return this._isOnline;
  }

  /**
   * Programmatically set offline mode.
   * @param {boolean} offline
   */
  setOfflineMode(offline) {
    this.forcedOffline = Boolean(offline);
    if (this.forcedOffline) {
      this._isOnline = false;
    }
  }

  /**
   * Immediately marks internet as unavailable upon external network failure (ENOTFOUND, timeouts).
   */
  recordNetworkFailure(err = null) {
    if (this._isOnline) {
      console.log(`[NetworkManager] Network connection unavailable (${err?.code || err?.message || 'offline'}). Switching to local offline mode.`);
    }
    this._isOnline = false;
    this._lastChecked = Date.now();
  }

  /**
   * Records successful external network communication.
   */
  recordNetworkSuccess() {
    if (!this.forcedOffline) {
      this._isOnline = true;
      this._lastChecked = Date.now();
    }
  }

  /**
   * Asynchronously checks whether the machine has active internet access.
   * Uses a fast 600ms DNS probe to avoid delaying requests.
   * @param {boolean} [force=false]
   * @returns {Promise<boolean>}
   */
  async checkConnectivity(force = false) {
    if (this.forcedOffline) {
      this._isOnline = false;
      return false;
    }

    const now = Date.now();
    if (!force && (now - this._lastChecked < this._checkInterval)) {
      return this._isOnline;
    }

    if (this._checkingPromise) {
      return this._checkingPromise;
    }

    this._checkingPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._isOnline = false;
        this._lastChecked = Date.now();
        resolve(false);
      }, 600); // 600ms fast timeout

      dns.lookup('dns.google', (err) => {
        clearTimeout(timer);
        if (err) {
          this._isOnline = false;
        } else {
          this._isOnline = true;
        }
        this._lastChecked = Date.now();
        resolve(this._isOnline);
      });
    }).finally(() => {
      this._checkingPromise = null;
    });

    return this._checkingPromise;
  }
}

export const networkManager = new NetworkManager();
export default networkManager;
