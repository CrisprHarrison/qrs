/**
 * File handling utilities for the QR code generator
 */

/**
 * Merge multiple Uint8Array into a single Uint8Array
 * Each chunk is prefixed with a 4-byte Uint32 to store the length of the chunk
 * @param {Uint8Array[]} arrays - Arrays to merge
 * @returns {Uint8Array} - Merged array
 */
function mergeUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length + 4, 0); // 4 bytes for length (Uint32)
  
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  
  arrays.forEach((arr) => {
    const length = arr.length;
    // Store the length as a 4-byte Uint32
    mergedArray[offset++] = (length >> 24) & 0xFF;
    mergedArray[offset++] = (length >> 16) & 0xFF;
    mergedArray[offset++] = (length >> 8) & 0xFF;
    mergedArray[offset++] = length & 0xFF;
    
    // Copy data
    mergedArray.set(arr, offset);
    offset += length;
  });
  
  return mergedArray;
}

/**
 * Split a merged Uint8Array into multiple Uint8Array
 * @param {Uint8Array} mergedArray - Merged array to split
 * @returns {Uint8Array[]} - Array of split arrays
 */
function splitUint8Arrays(mergedArray) {
  const arrays = [];
  let offset = 0;
  
  while (offset < mergedArray.length) {
    // Read chunk length
    const length = (mergedArray[offset++] << 24)
      | (mergedArray[offset++] << 16)
      | (mergedArray[offset++] << 8)
      | mergedArray[offset++];
    
    // Slice the chunk
    const arr = mergedArray.slice(offset, offset + length);
    arrays.push(arr);
    offset += length;
  }
  
  return arrays;
}

/**
 * Convert a string to a Uint8Array
 * @param {string} str - String to convert
 * @returns {Uint8Array} - Resulting array
 */
function stringToUint8Array(str) {
  const data = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i);
  }
  return data;
}

/**
 * Convert a Uint8Array to a string
 * @param {Uint8Array} data - Array to convert
 * @returns {string} - Resulting string
 */
function uint8ArrayToString(data) {
  return String.fromCharCode.apply(null, data);
}

/**
 * Append metadata to a buffer
 * @param {Uint8Array} data - Buffer data
 * @param {Object} meta - Metadata to append
 * @returns {Uint8Array} - Buffer with metadata
 */
function appendMetaToBuffer(data, meta) {
  const json = JSON.stringify(meta);
  const metaBuffer = stringToUint8Array(json);
  return mergeUint8Arrays([metaBuffer, data]);
}

/**
 * Append file header metadata to a buffer
 * @param {Uint8Array} data - Buffer data
 * @param {Object} meta - File metadata (filename, contentType)
 * @returns {Uint8Array} - Buffer with file metadata
 */
function appendFileHeaderMetaToBuffer(data, meta) {
  return appendMetaToBuffer(data, meta);
}

/**
 * Read metadata from a buffer
 * @param {Uint8Array} buffer - Buffer with metadata
 * @returns {[Uint8Array, Object]} - Tuple of [data, metadata]
 */
function readMetaFromBuffer(buffer) {
  const splitted = splitUint8Arrays(buffer);
  if (splitted.length !== 2) {
    throw new Error('Invalid buffer');
  }
  
  const [metaBuffer, data] = splitted;
  const meta = JSON.parse(uint8ArrayToString(metaBuffer));
  return [data, meta];
}

/**
 * Read file header metadata from a buffer
 * @param {Uint8Array} buffer - Buffer with file metadata
 * @returns {[Uint8Array, Object]} - Tuple of [data, metadata]
 */
function readFileHeaderMetaFromBuffer(buffer) {
  const [data, meta] = readMetaFromBuffer(buffer);
  if (!meta.contentType) {
    meta.contentType = 'application/octet-stream';
  }
  
  return [data, meta];
}

/**
 * Handle file selection
 * @param {File} file - Selected file
 * @returns {Promise<{data: Uint8Array, filename: string, contentType: string}>} - Processed file data
 */
async function handleFileSelection(file) {
  if (!file) {
    throw new Error('No file selected');
  }
  
  const filename = file.name;
  const contentType = file.type || 'application/octet-stream';
  
  // Read file as ArrayBuffer
  const buffer = await file.arrayBuffer();
  
  // Append file metadata
  const data = appendFileHeaderMetaToBuffer(new Uint8Array(buffer), {
    filename,
    contentType,
  });
  
  return {
    data,
    filename,
    contentType
  };
}

/**
 * Setup file drop zone behavior
 * @param {HTMLElement} dropZone - Drop zone element
 * @param {Function} onFileDropped - Callback when file is dropped
 */
function setupDropZone(dropZone, onFileDropped) {
  let dragCounter = 0;
  
  function onDragEnter(event) {
    event.preventDefault();
    dragCounter++;
    dropZone.classList.add('dragging');
  }
  
  function onDragLeave(event) {
    event.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropZone.classList.remove('dragging');
    }
  }
  
  function onDragOver(event) {
    event.preventDefault();
  }
  
  function onDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    dragCounter = 0;
    
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file) {
        onFileDropped(file);
      }
      event.dataTransfer.clearData();
    }
  }
  
  // Add event listeners
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);
  
  // Return cleanup function
  return function cleanup() {
    window.removeEventListener('dragenter', onDragEnter);
    window.removeEventListener('dragleave', onDragLeave);
    window.removeEventListener('dragover', onDragOver);
    window.removeEventListener('drop', onDrop);
  };
}

/**
 * Setup file input behavior
 * @param {HTMLInputElement} fileInput - File input element
 * @param {Function} onFileSelected - Callback when file is selected
 */
function setupFileInput(fileInput, onFileSelected) {
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    // Reset input to allow selecting the same file again
    fileInput.value = '';
  });
}