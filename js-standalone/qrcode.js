/**
 * QR code generation utilities
 */

/**
 * QR code error correction levels
 * @enum {string}
 */
const ErrorCorrectionLevel = {
  L: 'L', // 7% of codewords can be restored
  M: 'M', // 15% of codewords can be restored
  Q: 'Q', // 25% of codewords can be restored
  H: 'H'  // 30% of codewords can be restored
};

/**
 * Generate QR code SVG for the given data
 * @param {string} data - Data to encode in QR code
 * @param {Object} options - Options for QR code generation
 * @param {number} [options.border=4] - Border size (quiet zone)
 * @param {string} [options.color='#000000'] - Foreground color
 * @param {string} [options.background='#ffffff'] - Background color
 * @param {string} [options.ecLevel=ErrorCorrectionLevel.M] - Error correction level
 * @returns {string} - SVG string representation of QR code
 */
function generateQRCodeSVG(data, options = {}) {
  // Use a lightweight QR code library included in the HTML file
  // We'll use the QRCode library which will be loaded in the HTML
  
  const border = options.border ?? 4;
  const color = options.color ?? '#000000';
  const background = options.background ?? '#ffffff';
  const ecLevel = options.ecLevel ?? ErrorCorrectionLevel.M;
  
  // Create QR code using the library included in HTML
  const qr = new QRCode({
    content: data,
    padding: border,
    width: 256,
    height: 256,
    color: color,
    background: background,
    ecl: ecLevel
  });
  
  return qr.svg();
}

/**
 * Convert an encoded block to a Base64 string for QR code generation
 * @param {Uint8Array} binary - Binary data from blockToBinary
 * @returns {string} - Base64 encoded string
 */
function binaryToBase64(binary) {
  // Convert binary data to Base64
  let base64 = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let i = 0;
  
  while (i < binary.length) {
    const b1 = binary[i++] || 0;
    const b2 = binary[i++] || 0;
    const b3 = binary[i++] || 0;
    
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    
    base64 += chars[(triplet >> 18) & 0x3F];
    base64 += chars[(triplet >> 12) & 0x3F];
    base64 += i > binary.length + 1 ? '=' : chars[(triplet >> 6) & 0x3F];
    base64 += i > binary.length ? '=' : chars[triplet & 0x3F];
  }
  
  return base64;
}

/**
 * Generate a QR code SVG for an encoded block
 * @param {Object} block - Encoded block
 * @param {string} [prefix=''] - Optional prefix to add to data
 * @returns {string} - SVG string
 */
function generateBlockQRCode(block, prefix = '') {
  // Convert block to binary
  const binary = blockToBinary(block);
  
  // Convert binary to Base64
  const base64 = binaryToBase64(binary);
  
  // Generate QR code SVG
  return generateQRCodeSVG(prefix + base64, {
    border: 5,
    ecLevel: ErrorCorrectionLevel.M
  });
}