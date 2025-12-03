/**
 * Image Matching Utilities
 * Free, open-source, no AI dependencies
 * Uses classic computer vision techniques for dish recognition
 */

/**
 * Compute Difference Hash (dHash) - More robust than average hash
 * Compares adjacent pixels for gradient-based matching
 * @param {string} imageSrc - Image source (data URL or URL)
 * @param {number} hashSize - Size of hash (default 8 = 64-bit hash)
 * @returns {Promise<{hash: string, colorHist: number[], brightness: number}>}
 */
export function computeImageFeatures(imageSrc, hashSize = 8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        // For dHash, we need hashSize+1 width to compare adjacent pixels
        const width = hashSize + 1;
        const height = hashSize;
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;
        
        // Compute dHash (difference hash)
        const dHash = computeDHash(imageData, width, height);
        
        // Compute pHash (perceptual hash) for better accuracy
        canvas.width = hashSize;
        canvas.height = hashSize;
        ctx.drawImage(img, 0, 0, hashSize, hashSize);
        const pHashData = ctx.getImageData(0, 0, hashSize, hashSize).data;
        const pHash = computePHash(pHashData, hashSize);
        
        // Compute color histogram (8 bins per channel = 512 bins total)
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        const colorData = ctx.getImageData(0, 0, 64, 64).data;
        const colorHist = computeColorHistogram(colorData);
        
        // Calculate average brightness
        const brightness = computeBrightness(pHashData);
        
        // Validate image quality
        if (brightness < 25) {
          reject(new Error("TOO_DARK"));
          return;
        }
        if (brightness > 245) {
          reject(new Error("TOO_BRIGHT"));
          return;
        }
        
        resolve({
          dHash,
          pHash,
          colorHist,
          brightness,
          // Combined hash for storage (uses pHash as primary)
          hash: pHash
        });
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error("FAILED_LOAD"));
    img.src = imageSrc;
  });
}

/**
 * Compute Difference Hash (dHash)
 * Compares each pixel with its right neighbor
 */
function computeDHash(imageData, width, height) {
  let hash = "";
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + x + 1) * 4;
      
      // Convert to grayscale using luminosity formula
      const gray1 = 0.299 * imageData[idx1] + 0.587 * imageData[idx1 + 1] + 0.114 * imageData[idx1 + 2];
      const gray2 = 0.299 * imageData[idx2] + 0.587 * imageData[idx2 + 1] + 0.114 * imageData[idx2 + 2];
      
      // Compare: is left pixel brighter than right?
      hash += gray1 > gray2 ? "1" : "0";
    }
  }
  
  return hash;
}

/**
 * Compute Perceptual Hash (pHash)
 * Uses average comparison with better robustness
 */
function computePHash(imageData, size) {
  const grayscale = [];
  let total = 0;
  
  for (let i = 0; i < imageData.length; i += 4) {
    const gray = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
    grayscale.push(gray);
    total += gray;
  }
  
  const avg = total / grayscale.length;
  return grayscale.map(val => val > avg ? "1" : "0").join("");
}

/**
 * Compute Color Histogram
 * 8 bins per RGB channel = 24 values total (compact representation)
 * This helps match dishes by color profile
 */
function computeColorHistogram(imageData, bins = 8) {
  const histR = new Array(bins).fill(0);
  const histG = new Array(bins).fill(0);
  const histB = new Array(bins).fill(0);
  const binSize = 256 / bins;
  const totalPixels = imageData.length / 4;
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    
    histR[Math.min(Math.floor(r / binSize), bins - 1)]++;
    histG[Math.min(Math.floor(g / binSize), bins - 1)]++;
    histB[Math.min(Math.floor(b / binSize), bins - 1)]++;
  }
  
  // Normalize to percentages (0-100)
  const normalize = (hist) => hist.map(v => Math.round((v / totalPixels) * 100));
  
  return [...normalize(histR), ...normalize(histG), ...normalize(histB)];
}

/**
 * Compute average brightness
 */
function computeBrightness(imageData) {
  let total = 0;
  const pixelCount = imageData.length / 4;
  
  for (let i = 0; i < imageData.length; i += 4) {
    total += 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
  }
  
  return total / pixelCount;
}

/**
 * Hamming Distance - count differing bits between two hashes
 */
export function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2) return 64; // Max distance
  let dist = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Color Histogram Similarity using Chi-Square distance
 * Returns 0-1 (1 = identical)
 */
export function colorHistogramSimilarity(hist1, hist2) {
  if (!hist1 || !hist2 || hist1.length !== hist2.length) return 0;
  
  let chiSquare = 0;
  for (let i = 0; i < hist1.length; i++) {
    const sum = hist1[i] + hist2[i];
    if (sum > 0) {
      chiSquare += Math.pow(hist1[i] - hist2[i], 2) / sum;
    }
  }
  
  // Convert to similarity (0-1 range)
  // Lower chi-square = more similar
  const maxChiSquare = 200; // Empirical maximum
  return Math.max(0, 1 - (chiSquare / maxChiSquare));
}

/**
 * Combined similarity score from multiple signals
 * Weights can be adjusted based on what works best
 */
export function combinedSimilarity(features1, features2, weights = {
  pHash: 0.4,    // Perceptual hash (structure)
  dHash: 0.3,    // Difference hash (edges)
  color: 0.3     // Color histogram
}) {
  // Hash similarities (convert hamming distance to 0-1 similarity)
  const pHashSim = 1 - (hammingDistance(features1.pHash, features2.pHash) / 64);
  const dHashSim = 1 - (hammingDistance(features1.dHash, features2.dHash) / 64);
  
  // Color similarity
  const colorSim = colorHistogramSimilarity(features1.colorHist, features2.colorHist);
  
  // Weighted combination
  const score = (
    weights.pHash * pHashSim +
    weights.dHash * dHashSim +
    weights.color * colorSim
  );
  
  return {
    score: Math.round(score * 100), // 0-100
    pHashSim: Math.round(pHashSim * 100),
    dHashSim: Math.round(dHashSim * 100),
    colorSim: Math.round(colorSim * 100)
  };
}

/**
 * Match uploaded image against database dishes
 * @param {object} uploadedFeatures - Features of uploaded image
 * @param {array} dishes - Array of dishes with their features
 * @returns {array} Sorted matches with confidence scores
 */
export function matchDishes(uploadedFeatures, dishes) {
  const matches = dishes
    .filter(dish => dish.image_hash || dish.color_histogram)
    .map(dish => {
      const dishFeatures = {
        pHash: dish.image_hash,
        dHash: dish.d_hash || dish.image_hash, // Fallback to pHash
        colorHist: dish.color_histogram ? 
          (typeof dish.color_histogram === 'string' ? 
            JSON.parse(dish.color_histogram) : dish.color_histogram) : 
          null
      };
      
      // Calculate similarity
      let score;
      if (dishFeatures.colorHist) {
        const sim = combinedSimilarity(uploadedFeatures, dishFeatures);
        score = sim.score;
      } else {
        // Fallback: just use hash if no color histogram
        score = Math.round((1 - hammingDistance(uploadedFeatures.pHash, dishFeatures.pHash) / 64) * 100);
      }
      
      return {
        ...dish,
        confidence: score
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
  
  return matches;
}

/**
 * Quick hash computation for server-side use
 * Works with raw bytes instead of canvas
 */
export function computeHashFromBytes(bytes, width, height) {
  const grayscale = [];
  let total = 0;
  
  // Assuming RGB or RGBA format
  const channels = bytes.length / (width * height);
  const pixelCount = width * height;
  
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * channels;
    const r = bytes[idx] || 0;
    const g = bytes[idx + 1] || 0;
    const b = bytes[idx + 2] || 0;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale.push(gray);
    total += gray;
  }
  
  const avg = total / grayscale.length;
  return grayscale.map(val => val > avg ? "1" : "0").join("");
}

export default {
  computeImageFeatures,
  hammingDistance,
  colorHistogramSimilarity,
  combinedSimilarity,
  matchDishes,
  computeHashFromBytes
};

