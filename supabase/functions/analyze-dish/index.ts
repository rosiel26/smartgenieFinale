import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Analyze Dish - Hybrid Vector + Hash Matching
 * 1. Vector search via pgvector (fast semantic matching)
 * 2. Hash verification (structural confirmation)
 * 3. Combined confidence score
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EMBEDDING_DIM = 768;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// EMBEDDING GENERATION (same as generate-embedding)
// ============================================
function computeLocalEmbedding(imageBytes: Uint8Array): number[] {
  const features: number[] = [];
  
  const histogram = new Array(256).fill(0);
  for (const byte of imageBytes) {
    histogram[byte]++;
  }
  
  const total = imageBytes.length;
  const normalizedHist = histogram.map(h => h / total);
  
  let mean = 0;
  for (let i = 0; i < 256; i++) {
    mean += i * normalizedHist[i];
  }
  features.push(mean / 255);
  
  let variance = 0;
  for (let i = 0; i < 256; i++) {
    variance += normalizedHist[i] * Math.pow((i - mean) / 255, 2);
  }
  features.push(Math.sqrt(variance));
  
  let skewness = 0, kurtosis = 0;
  const std = Math.sqrt(variance) || 1;
  for (let i = 0; i < 256; i++) {
    const z = (i - mean) / (std * 255);
    skewness += normalizedHist[i] * Math.pow(z, 3);
    kurtosis += normalizedHist[i] * Math.pow(z, 4);
  }
  features.push(skewness);
  features.push(kurtosis - 3);
  
  const binSize = 8;
  for (let bin = 0; bin < 32; bin++) {
    let binSum = 0;
    for (let i = bin * binSize; i < (bin + 1) * binSize; i++) {
      binSum += normalizedHist[i];
    }
    features.push(binSum);
  }
  
  const chunkSize = Math.floor(imageBytes.length / 64);
  for (let chunk = 0; chunk < 64; chunk++) {
    const start = chunk * chunkSize;
    const end = Math.min(start + chunkSize, imageBytes.length);
    let chunkMean = 0;
    for (let i = start; i < end; i++) {
      chunkMean += imageBytes[i];
    }
    features.push((chunkMean / (end - start)) / 255);
  }
  
  for (let i = 0; i < 32; i++) {
    const chunk1Start = i * chunkSize * 2;
    const chunk2Start = (i + 1) * chunkSize * 2;
    let diff = 0;
    const len = Math.min(chunkSize, imageBytes.length - chunk2Start);
    if (len > 0) {
      for (let j = 0; j < len; j++) {
        diff += Math.abs((imageBytes[chunk1Start + j] || 0) - (imageBytes[chunk2Start + j] || 0));
      }
      features.push((diff / len) / 255);
    } else {
      features.push(0);
    }
  }
  
  for (let freq = 1; freq <= 16; freq++) {
    let cosSum = 0, sinSum = 0;
    const step = Math.floor(imageBytes.length / 1000) || 1;
    for (let i = 0; i < imageBytes.length; i += step) {
      const angle = (2 * Math.PI * freq * i) / imageBytes.length;
      cosSum += imageBytes[i] * Math.cos(angle);
      sinSum += imageBytes[i] * Math.sin(angle);
    }
    features.push(Math.sqrt(cosSum * cosSum + sinSum * sinSum) / imageBytes.length);
  }
  
  const patterns: number[] = [];
  for (let patternLen = 2; patternLen <= 8; patternLen++) {
    let matches = 0;
    const sampleStep = Math.floor(imageBytes.length / 500) || 1;
    for (let i = 0; i < imageBytes.length - patternLen * 2; i += sampleStep) {
      let isMatch = true;
      for (let j = 0; j < patternLen; j++) {
        if (Math.abs(imageBytes[i + j] - imageBytes[i + patternLen + j]) > 10) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) matches++;
    }
    patterns.push(matches / (imageBytes.length / sampleStep));
  }
  features.push(...patterns);
  
  const channels = [[], [], []] as number[][];
  for (let i = 0; i < Math.min(imageBytes.length, 30000); i++) {
    channels[i % 3].push(imageBytes[i]);
  }
  
  for (const channel of channels) {
    if (channel.length === 0) {
      features.push(0, 0, 0, 0);
      continue;
    }
    const cMean = channel.reduce((a, b) => a + b, 0) / channel.length;
    const cVar = channel.reduce((a, b) => a + Math.pow(b - cMean, 2), 0) / channel.length;
    const cMin = Math.min(...channel);
    const cMax = Math.max(...channel);
    features.push(cMean / 255, Math.sqrt(cVar) / 255, cMin / 255, cMax / 255);
  }
  
  let entropy = 0;
  for (const p of normalizedHist) {
    if (p > 0) entropy -= p * Math.log2(p);
  }
  features.push(entropy / 8);
  
  let cumSum = 0;
  const percentiles = [0.1, 0.25, 0.5, 0.75, 0.9];
  let pIdx = 0;
  for (let i = 0; i < 256 && pIdx < percentiles.length; i++) {
    cumSum += normalizedHist[i];
    while (pIdx < percentiles.length && cumSum >= percentiles[pIdx]) {
      features.push(i / 255);
      pIdx++;
    }
  }
  while (pIdx < percentiles.length) {
    features.push(1);
    pIdx++;
  }
  
  while (features.length < EMBEDDING_DIM) {
    const i = features.length;
    const f1 = features[i % features.length];
    const f2 = features[(i * 7) % features.length];
    features.push((f1 + f2) / 2);
  }
  
  const result = features.slice(0, EMBEDDING_DIM);
  const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0)) || 1;
  return result.map(v => v / norm);
}

// ============================================
// HASH-BASED MATCHING (existing logic)
// ============================================
function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2) return 64;
  let dist = 0;
  const len = Math.min(hash1.length, hash2.length);
  for (let i = 0; i < len; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

function colorHistogramSimilarity(hist1: number[], hist2: number[]): number {
  if (!hist1 || !hist2 || hist1.length !== hist2.length) return 0;
  
  let chiSquare = 0;
  for (let i = 0; i < hist1.length; i++) {
    const sum = hist1[i] + hist2[i];
    if (sum > 0) {
      chiSquare += Math.pow(hist1[i] - hist2[i], 2) / sum;
    }
  }
  
  const maxChiSquare = 200;
  return Math.max(0, 1 - (chiSquare / maxChiSquare));
}

function hashSimilarity(
  uploadedPHash: string, 
  uploadedDHash: string,
  uploadedColorHist: number[],
  dishPHash: string,
  dishDHash: string | null,
  dishColorHist: number[] | null
): { score: number; pHashSim: number; dHashSim: number; colorSim: number } {
  const pHashSim = 1 - (hammingDistance(uploadedPHash, dishPHash) / 64);
  const effectiveDishDHash = dishDHash || dishPHash;
  const dHashSim = 1 - (hammingDistance(uploadedDHash, effectiveDishDHash) / 64);
  
  let colorSim = 0;
  if (dishColorHist && dishColorHist.length === 24 && uploadedColorHist && uploadedColorHist.length === 24) {
    colorSim = colorHistogramSimilarity(uploadedColorHist, dishColorHist);
  }
  
  let score: number;
  if (dishColorHist && dishColorHist.length === 24 && uploadedColorHist && uploadedColorHist.length === 24) {
    score = pHashSim * 0.4 + dHashSim * 0.3 + colorSim * 0.3;
  } else {
    score = pHashSim * 0.6 + dHashSim * 0.4;
  }
  
  return { 
    score, 
    pHashSim: Math.round(pHashSim * 100), 
    dHashSim: Math.round(dHashSim * 100), 
    colorSim: Math.round(colorSim * 100) 
  };
}

// Convert base64 to bytes
function base64ToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Format embedding for pgvector query
function formatEmbedding(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req) => {
  console.log(`Received ${req.method} request`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData, features } = await req.json();

    if (!imageData && !features?.pHash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either imageData or features (pHash, colorHist) is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we have embeddings in the database
    const { count: embeddingCount } = await supabase
      .from('dishinfo')
      .select('*', { count: 'exact', head: true })
      .not('image_embedding', 'is', null);

    const hasEmbeddings = (embeddingCount || 0) > 0;
    console.log(`Database has ${embeddingCount} dishes with embeddings`);

    let vectorMatches: any[] = [];
    let method = 'hash-only';

    // ============================================
    // VECTOR SEARCH (if embeddings available)
    // ============================================
    if (hasEmbeddings && imageData) {
      try {
        console.log('Performing vector search...');
        
        // Generate embedding from uploaded image
        const imageBytes = base64ToBytes(imageData);
        const uploadedEmbedding = computeLocalEmbedding(imageBytes);
        
        // Use pgvector similarity search
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          'match_dishes_by_embedding',
          {
            query_embedding: uploadedEmbedding,
            match_threshold: 0.5,
            match_count: 20
          }
        );

        if (vectorError) {
          console.warn('Vector search failed, falling back to hash:', vectorError.message);
        } else if (vectorResults && vectorResults.length > 0) {
          vectorMatches = vectorResults;
          method = 'hybrid';
          console.log(`Vector search found ${vectorMatches.length} candidates`);
        }
      } catch (e) {
        console.warn('Vector embedding error:', e);
      }
    }

    // ============================================
    // HASH MATCHING
    // ============================================
    let hashMatches: any[] = [];
    
    if (features?.pHash) {
      const uploadedPHash = features.pHash;
      const uploadedDHash = features.dHash || features.pHash;
      const uploadedColorHist = features.colorHist || [];

      // If we have vector candidates, only check those for hash matching
      // Otherwise, fall back to checking all dishes
      let dishesToCheck: any[];
      
      if (vectorMatches.length > 0) {
        // Re-rank vector candidates with hash matching
        dishesToCheck = vectorMatches;
        console.log('Re-ranking vector candidates with hash verification');
      } else {
        // Fall back to fetching all dishes (original behavior)
        console.log('Falling back to full hash scan');
        const { data: allDishes, error: fetchError } = await supabase
          .from('dishinfo')
          .select(`
            id, name, image_url, calories_value, protein_value,
            fat_value, carbs_value, ingredient, store, description,
            image_hash, d_hash, color_histogram
          `);
        
        if (fetchError) throw fetchError;
        dishesToCheck = allDishes || [];
        method = 'hash-only';
      }

      // Calculate hash similarity for each candidate
      for (const dish of dishesToCheck) {
        if (!dish.image_hash) continue;
        
        let dishColorHist: number[] | null = null;
        if (dish.color_histogram) {
          try {
            dishColorHist = typeof dish.color_histogram === 'string' 
              ? JSON.parse(dish.color_histogram) 
              : dish.color_histogram;
          } catch {
            dishColorHist = null;
          }
        }
        
        const similarity = hashSimilarity(
          uploadedPHash,
          uploadedDHash,
          uploadedColorHist,
          dish.image_hash,
          dish.d_hash,
          dishColorHist
        );
        
        // Combine vector similarity (if available) with hash similarity
        let combinedScore = similarity.score;
        if (dish.similarity !== undefined) {
          // Hybrid scoring: 60% vector, 40% hash
          combinedScore = (dish.similarity * 0.6) + (similarity.score * 0.4);
        }
        
        hashMatches.push({
          dish,
          score: combinedScore,
          vectorScore: dish.similarity,
          hashScore: similarity.score,
          pHashSim: similarity.pHashSim,
          dHashSim: similarity.dHashSim,
          colorSim: similarity.colorSim,
          hashDistance: hammingDistance(uploadedPHash, dish.image_hash)
        });
      }
    } else if (vectorMatches.length > 0) {
      // No hash features, use vector results directly
      hashMatches = vectorMatches.map(dish => ({
        dish,
        score: dish.similarity,
        vectorScore: dish.similarity,
        hashScore: null,
        pHashSim: null,
        dHashSim: null,
        colorSim: null,
        hashDistance: null
      }));
      method = 'vector-only';
    }

    if (hashMatches.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No matching dish found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort by combined score and return top 5
    const topMatches = hashMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(match => ({
        id: match.dish.id,
        name: match.dish.name,
        image_url: match.dish.image_url,
        calories_value: match.dish.calories_value,
        protein_value: match.dish.protein_value,
        fat_value: match.dish.fat_value,
        carbs_value: match.dish.carbs_value,
        ingredient: match.dish.ingredient,
        store: match.dish.store,
        description: match.dish.description,
        confidence: Math.round(match.score * 100),
        hashDistance: match.hashDistance,
        details: {
          vectorScore: match.vectorScore ? Math.round(match.vectorScore * 100) : null,
          hashScore: match.hashScore ? Math.round(match.hashScore * 100) : null,
          pHashSim: match.pHashSim,
          dHashSim: match.dHashSim,
          colorSim: match.colorSim
        }
      }));

    console.log(`Method: ${method}, Best match: ${topMatches[0]?.name} (${topMatches[0]?.confidence}%)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: topMatches, 
        bestMatch: topMatches[0] || null,
        method,
        embeddingsAvailable: hasEmbeddings
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-dish function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
