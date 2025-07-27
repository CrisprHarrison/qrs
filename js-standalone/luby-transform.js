/**
 * Luby Transform implementation for the QR code generator
 * This implements a fountain code for reliable data transmission
 */

/**
 * Interface for encoded block header
 * @typedef {Object} EncodedHeader
 * @property {number} k - Number of original data blocks
 * @property {number} bytes - Data length for Uint8Array data
 * @property {number} checksum - Checksum, CRC32 and XOR of k
 */

/**
 * Interface for encoded block
 * @typedef {Object} EncodedBlock
 * @property {number} k - Number of original data blocks
 * @property {number} bytes - Data length for Uint8Array data
 * @property {number} checksum - Checksum, CRC32 and XOR of k
 * @property {number[]} indices - Indices of original blocks used
 * @property {Uint8Array} data - Encoded data
 */

/**
 * Convert a block to binary format
 * @param {EncodedBlock} block - Block to convert
 * @returns {Uint8Array} - Binary representation
 */
function blockToBinary(block) {
  const { k, bytes, checksum, indices, data } = block;
  const header = new Uint32Array([
    indices.length,
    ...indices,
    k,
    bytes,
    checksum,
  ]);

  const binary = new Uint8Array(header.length * 4 + data.length);
  let offset = 0;
  binary.set(new Uint8Array(header.buffer), offset);
  offset += header.length * 4;
  binary.set(data, offset);

  return binary;
}

/**
 * Convert binary data to a block
 * @param {Uint8Array} binary - Binary data
 * @returns {EncodedBlock} - Decoded block
 */
function binaryToBlock(binary) {
  // Create a DataView to read Uint32 values
  const dataView = new DataView(binary.buffer, binary.byteOffset);
  
  // Read the degree (number of indices)
  const degree = dataView.getUint32(0, false);
  
  // Extract indices
  const indices = [];
  for (let i = 0; i < degree; i++) {
    indices.push(dataView.getUint32((i + 1) * 4, false));
  }
  
  // Extract header values
  const k = dataView.getUint32((degree + 1) * 4, false);
  const bytes = dataView.getUint32((degree + 2) * 4, false);
  const checksum = dataView.getUint32((degree + 3) * 4, false);
  
  // Extract data
  const data = binary.slice((degree + 4) * 4);
  
  return {
    k,
    bytes,
    checksum,
    indices,
    data,
  };
}

/**
 * XOR two Uint8Arrays
 * @param {Uint8Array} a - First array
 * @param {Uint8Array} b - Second array
 * @returns {Uint8Array} - Result of XOR operation
 */
function xorUint8Array(a, b) {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

/**
 * Slice data into blocks of specified size
 * @param {Uint8Array} data - Data to slice
 * @param {number} blockSize - Size of each block
 * @returns {Uint8Array[]} - Array of data blocks
 */
function sliceData(data, blockSize) {
  const blocks = [];
  for (let i = 0; i < data.length; i += blockSize) {
    const block = new Uint8Array(blockSize);
    block.set(data.slice(i, i + blockSize));
    blocks.push(block);
  }
  return blocks;
}

/**
 * Use Ideal Soliton Distribution to select degree
 * @param {number} k - Number of blocks
 * @returns {number} - Selected degree
 */
function getRandomDegree(k) {
  const probabilities = Array(k).fill(0);
  
  // Calculate the probabilities of the Ideal Soliton Distribution
  probabilities[0] = 1 / k; // P(1) = 1/k
  for (let d = 2; d <= k; d++) {
    probabilities[d - 1] = 1 / (d * (d - 1));
  }
  
  // Accumulate the probabilities to generate the cumulative distribution
  const cumulativeProbabilities = [];
  let sum = 0;
  for (const p of probabilities) {
    sum += p;
    cumulativeProbabilities.push(sum);
  }
  
  // Generate a random number between [0,1] and select the corresponding degree
  const randomValue = Math.random();
  for (let i = 0; i < cumulativeProbabilities.length; i++) {
    if (randomValue < cumulativeProbabilities[i]) {
      return i + 1;
    }
  }
  
  return k; // Theoretically, this line should never be reached
}

/**
 * Randomly select indices of degree number of original data blocks
 * @param {number} k - Number of blocks
 * @param {number} degree - Degree to select
 * @returns {number[]} - Selected indices
 */
function getRandomIndices(k, degree) {
  const indices = new Set();
  while (indices.size < degree) {
    const randomIndex = Math.floor(Math.random() * k);
    indices.add(randomIndex);
  }
  return Array.from(indices);
}

/**
 * LtEncoder class for encoding data using Luby Transform
 */
class LtEncoder {
  /**
   * Create a new LtEncoder
   * @param {Uint8Array} data - Data to encode
   * @param {number} sliceSize - Size of each slice
   * @param {boolean} compress - Whether to compress data
   */
  constructor(data, sliceSize, compress = true) {
    this.data = data;
    this.sliceSize = sliceSize;
    this.compress = compress;
    
    // Compress data if needed (using pako in the HTML file)
    this.compressed = compress ? pako.deflate(data) : data;
    
    // Slice the data
    this.indices = sliceData(this.compressed, sliceSize);
    this.k = this.indices.length;
    this.checksum = getChecksum(this.data, this.k);
    this.bytes = this.compressed.length;
  }
  
  /**
   * Create a block from selected indices
   * @param {number[]} indices - Indices to use
   * @returns {EncodedBlock} - Created block
   */
  createBlock(indices) {
    const data = new Uint8Array(this.sliceSize);
    for (const index of indices) {
      const indicesIndex = this.indices[index];
      for (let i = 0; i < this.sliceSize; i++) {
        data[i] = data[i] ^ indicesIndex[i];
      }
    }
    
    return {
      k: this.k,
      bytes: this.bytes,
      checksum: this.checksum,
      indices,
      data,
    };
  }
  
  /**
   * Generator function that creates an infinite stream of encoded blocks
   * @returns {Generator<EncodedBlock, never>} - Generator of blocks
   */
  *fountain() {
    while (true) {
      const degree = getRandomDegree(this.k);
      const selectedIndices = getRandomIndices(this.k, degree);
      yield this.createBlock(selectedIndices);
    }
  }
}

/**
 * Create a new LtEncoder
 * @param {Uint8Array} data - Data to encode
 * @param {number} sliceSize - Size of each slice
 * @param {boolean} compress - Whether to compress data
 * @returns {LtEncoder} - Created encoder
 */
function createEncoder(data, sliceSize, compress = true) {
  return new LtEncoder(data, sliceSize, compress);
}

// Using getChecksum from checksum.js in HTML