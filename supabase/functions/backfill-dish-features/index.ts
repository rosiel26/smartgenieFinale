import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeJpeg } from "https://deno.land/x/jpegts@1.1/mod.ts";
import { decode as decodePng } from "https://deno.land/x/pngs@0.1.1/mod.ts";

/**
 * Backfill Edge Function
 * Computes image hashes and color histograms for existing dishes
 * Uses proper image decoding to match browser Canvas behavior
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Detect image MIME type from bytes
 */
function detectMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  return 'image/jpeg';
}

/**
 * Decode image to raw RGBA pixels
 */
async function decodeImage(bytes: Uint8Array): Promise<{ pixels: Uint8Array; width: number; height: number } | null> {
  const mimeType = detectMimeType(bytes);
  
  try {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      const decoded = decodeJpeg(bytes);
      if (decoded && decoded.data) {
        const rgbData = decoded.data;
        const pixels = new Uint8Array((rgbData.length / 3) * 4);
        for (let i = 0, j = 0; i < rgbData.length; i += 3, j += 4) {
          pixels[j] = rgbData[i];
          pixels[j + 1] = rgbData[i + 1];
          pixels[j + 2] = rgbData[i + 2];
          pixels[j + 3] = 255;
        }
        return { pixels, width: decoded.width, height: decoded.height };
      }
    } else if (mimeType.includes('png')) {
      const decoded = decodePng(bytes);
      if (decoded && decoded.image) {
        return { pixels: decoded.image, width: decoded.width, height: decoded.height };
      }
    }
  } catch (error) {
    console.error('Image decode error:', error);
  }
  return null;
}

/**
 * Resize image pixels to target size
 */
function resizePixels(
  pixels: Uint8Array, 
  srcWidth: number, 
  srcHeight: number, 
  targetWidth: number, 
  targetHeight: number
): Uint8Array {
  const result = new Uint8Array(targetWidth * targetHeight * 4);
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor((x / targetWidth) * srcWidth);
      const srcY = Math.floor((y / targetHeight) * srcHeight);
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      
      result[dstIdx] = pixels[srcIdx] || 0;
      result[dstIdx + 1] = pixels[srcIdx + 1] || 0;
      result[dstIdx + 2] = pixels[srcIdx + 2] || 0;
      result[dstIdx + 3] = pixels[srcIdx + 3] || 255;
    }
  }
  
  return result;
}

/**
 * Compute Perceptual Hash (pHash) - matches browser Canvas implementation
 */
function computePHash(pixels: Uint8Array, width: number, height: number, hashSize: number = 8): string {
  const resized = resizePixels(pixels, width, height, hashSize, hashSize);
  
  const grayscale: number[] = [];
  let total = 0;
  
  for (let i = 0; i < resized.length; i += 4) {
    const r = resized[i];
    const g = resized[i + 1];
    const b = resized[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale.push(gray);
    total += gray;
  }
  
  const avg = total / grayscale.length;
  return grayscale.map(val => val > avg ? '1' : '0').join('');
}

/**
 * Compute Difference Hash (dHash)
 */
function computeDHash(pixels: Uint8Array, width: number, height: number, hashSize: number = 8): string {
  const resized = resizePixels(pixels, width, height, hashSize + 1, hashSize);
  
  let hash = '';
  const resizedWidth = hashSize + 1;
  
  for (let y = 0; y < hashSize; y++) {
    for (let x = 0; x < hashSize; x++) {
      const idx1 = (y * resizedWidth + x) * 4;
      const idx2 = (y * resizedWidth + x + 1) * 4;
      
      const gray1 = 0.299 * resized[idx1] + 0.587 * resized[idx1 + 1] + 0.114 * resized[idx1 + 2];
      const gray2 = 0.299 * resized[idx2] + 0.587 * resized[idx2 + 1] + 0.114 * resized[idx2 + 2];
      
      hash += gray1 > gray2 ? '1' : '0';
    }
  }
  
  return hash;
}

/**
 * Compute Color Histogram - 8 bins per RGB channel = 24 values
 */
function computeColorHistogram(pixels: Uint8Array, width: number, height: number): number[] {
  const resized = resizePixels(pixels, width, height, 64, 64);
  
  const bins = 8;
  const histR = new Array(bins).fill(0);
  const histG = new Array(bins).fill(0);
  const histB = new Array(bins).fill(0);
  const binSize = 256 / bins;
  const totalPixels = 64 * 64;
  
  for (let i = 0; i < resized.length; i += 4) {
    const r = resized[i];
    const g = resized[i + 1];
    const b = resized[i + 2];
    
    histR[Math.min(Math.floor(r / binSize), bins - 1)]++;
    histG[Math.min(Math.floor(g / binSize), bins - 1)]++;
    histB[Math.min(Math.floor(b / binSize), bins - 1)]++;
  }
  
  const normalize = (hist: number[]) => hist.map(v => Math.round((v / totalPixels) * 100));
  
  return [...normalize(histR), ...normalize(histG), ...normalize(histB)];
}

/**
 * Fetch image and decode to pixels
 */
async function fetchAndDecodeImage(imageUrl: string): Promise<{ pixels: Uint8Array; width: number; height: number } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return await decodeImage(bytes);
  } catch (error) {
    console.error('Failed to fetch/decode image:', imageUrl, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { limit = 50, offset = 0, forceUpdate = false } = await req.json().catch(() => ({}));
    
    console.log(`Backfilling dishes: limit=${limit}, offset=${offset}, forceUpdate=${forceUpdate}`);

    // Fetch dishes that need processing
    let query = supabase
      .from('dishinfo')
      .select('id, name, image_url, image_hash, d_hash, color_histogram')
      .not('image_url', 'is', null)
      .order('id')
      .range(offset, offset + limit - 1);
    
    if (!forceUpdate) {
      query = query.or('d_hash.is.null,color_histogram.is.null');
    }

    const { data: dishes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!dishes || dishes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No dishes to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${dishes.length} dishes...`);
    
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const dish of dishes) {
      try {
        if (!dish.image_url) continue;
        
        console.log(`Processing: ${dish.name}`);
        
        // Fetch and decode image properly
        const decoded = await fetchAndDecodeImage(dish.image_url);
        
        if (!decoded) {
          results.failed++;
          results.errors.push(`Failed to decode image for ${dish.name}`);
          continue;
        }

        // Compute features from decoded pixel data
        const pHash = computePHash(decoded.pixels, decoded.width, decoded.height);
        const dHash = computeDHash(decoded.pixels, decoded.width, decoded.height);
        const colorHistogram = computeColorHistogram(decoded.pixels, decoded.width, decoded.height);

        // Update database
        const { error: updateError } = await supabase
          .from('dishinfo')
          .update({
            image_hash: pHash,
            d_hash: dHash,
            color_histogram: colorHistogram
          })
          .eq('id', dish.id);

        if (updateError) {
          results.failed++;
          results.errors.push(`Failed to update ${dish.name}: ${updateError.message}`);
        } else {
          results.processed++;
          console.log(`✓ Updated: ${dish.name}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing ${dish.name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        message: `Processed ${results.processed} dishes, ${results.failed} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
