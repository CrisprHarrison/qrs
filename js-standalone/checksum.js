/**
 * Checksum utilities for the QR code generator
 */

/**
 * CRC32 lookup table
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }
  return table;
})();

/**
 * Calculate CRC32 checksum for a buffer
 * @param {Uint8Array} buf - Buffer to calculate checksum for
 * @returns {number} - CRC32 checksum
 */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Get the checksum for a data buffer and its slice count
 * @param {Uint8Array} data - Data buffer
 * @param {number} k - Number of slices
 * @returns {number} - Checksum value
 */
function getChecksum(data, k) {
  return crc32(data) ^ k;
}

export { getChecksum };