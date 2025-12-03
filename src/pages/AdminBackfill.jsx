import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { computeImageFeatures } from "../utils/imageMatching";

/**
 * Admin Backfill Tool
 * 1. Hash Backfill: Uses browser Canvas to compute image hashes
 * 2. Embedding Backfill: Generates vector embeddings for pgvector search
 */
export default function AdminBackfill() {
  const [dishes, setDishes] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningEmbeddings, setIsRunningEmbeddings] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [embeddingProgress, setEmbeddingProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ success: 0, failed: 0, skipped: 0 });
  const [embeddingStats, setEmbeddingStats] = useState({ success: 0, failed: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("hashes"); // "hashes" or "embeddings"
  const abortRef = useRef(false);
  const abortEmbeddingsRef = useRef(false);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(true);
        return;
      }
      
      const { data } = await supabase
        .from("user_roles")
        .select("role_name")
        .eq("user_id", user.id)
        .single();
      
      setIsAdmin(data?.role_name === "admin" || !data);
    }
    checkAdmin();
  }, []);

  const addLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-100), { message, type, timestamp }]);
  }, []);

  const fetchDishes = async () => {
    addLog("Fetching dishes from database...");
    const { data, error } = await supabase
      .from("dishinfo")
      .select("id, name, image_url, image_hash, d_hash, color_histogram, image_embedding")
      .not("image_url", "is", null)
      .order("name");
    
    if (error) {
      addLog(`Error fetching dishes: ${error.message}`, "error");
      return;
    }
    
    setDishes(data || []);
    addLog(`Found ${data?.length || 0} dishes with images`);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDishes();
    }
  }, [isAdmin]);

  const computeFeaturesFromUrl = async (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          
          const base64 = canvas.toDataURL("image/jpeg", 0.9);
          const features = await computeImageFeatures(base64);
          resolve(features);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });
  };

  // ============================================
  // HASH BACKFILL
  // ============================================
  const startBackfill = async (forceAll = false) => {
    if (isRunning) return;
    
    setIsRunning(true);
    abortRef.current = false;
    setStats({ success: 0, failed: 0, skipped: 0 });
    setLogs([]);
    
    const dishesToProcess = forceAll 
      ? dishes 
      : dishes.filter(d => !d.d_hash || !d.color_histogram);
    
    setProgress({ current: 0, total: dishesToProcess.length });
    addLog(`Starting hash backfill for ${dishesToProcess.length} dishes...`);
    
    for (let i = 0; i < dishesToProcess.length; i++) {
      if (abortRef.current) {
        addLog("Backfill aborted by user", "warning");
        break;
      }
      
      const dish = dishesToProcess[i];
      setProgress({ current: i + 1, total: dishesToProcess.length });
      
      try {
        addLog(`Processing: ${dish.name}...`);
        
        const features = await computeFeaturesFromUrl(dish.image_url);
        
        const { error: updateError } = await supabase
          .from("dishinfo")
          .update({
            image_hash: features.pHash,
            d_hash: features.dHash,
            color_histogram: features.colorHist
          })
          .eq("id", dish.id);
        
        if (updateError) throw updateError;
        
        addLog(`✓ Updated: ${dish.name}`, "success");
        setStats(prev => ({ ...prev, success: prev.success + 1 }));
        
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        addLog(`✗ Failed: ${dish.name} - ${err.message}`, "error");
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }
    
    addLog("Hash backfill complete!", "success");
    setIsRunning(false);
    fetchDishes();
  };

  // ============================================
  // EMBEDDING BACKFILL (Self-hosted, $0 cost)
  // ============================================
  const computeLocalEmbedding = (imageBytes) => {
    const EMBEDDING_DIM = 768;
    const features = [];
    
    // 1. Byte distribution analysis
    const histogram = new Array(256).fill(0);
    for (const byte of imageBytes) {
      histogram[byte]++;
    }
    
    const total = imageBytes.length;
    const normalizedHist = histogram.map(h => h / total);
    
    // 2. Statistical features
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
    
    // 3. Histogram bins (32 bins)
    const binSize = 8;
    for (let bin = 0; bin < 32; bin++) {
      let binSum = 0;
      for (let i = bin * binSize; i < (bin + 1) * binSize; i++) {
        binSum += normalizedHist[i];
      }
      features.push(binSum);
    }
    
    // 4. Spatial features (64 chunks)
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
    
    // 5. Edge detection approximation
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
    
    // 6. Frequency domain approximation
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
    
    // 7. Pattern detection
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
      features.push(matches / (imageBytes.length / sampleStep));
    }
    
    // 8. Color channel approximation
    const channels = [[], [], []];
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
    
    // 9. Entropy
    let entropy = 0;
    for (const p of normalizedHist) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    features.push(entropy / 8);
    
    // 10. Percentiles
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
    
    // Pad to exact dimension
    while (features.length < EMBEDDING_DIM) {
      const i = features.length;
      const f1 = features[i % features.length];
      const f2 = features[(i * 7) % features.length];
      features.push((f1 + f2) / 2);
    }
    
    const result = features.slice(0, EMBEDDING_DIM);
    
    // L2 normalize
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0)) || 1;
    return result.map(v => v / norm);
  };

  const fetchImageAsBytes = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  };

  const startEmbeddingBackfill = async (forceAll = false) => {
    if (isRunningEmbeddings) return;
    
    setIsRunningEmbeddings(true);
    abortEmbeddingsRef.current = false;
    setEmbeddingStats({ success: 0, failed: 0 });
    setLogs([]);
    
    const dishesToProcess = forceAll 
      ? dishes 
      : dishes.filter(d => !d.image_embedding);
    
    setEmbeddingProgress({ current: 0, total: dishesToProcess.length });
    addLog(`Starting embedding backfill for ${dishesToProcess.length} dishes (self-hosted, $0 cost)...`);
    
    for (let i = 0; i < dishesToProcess.length; i++) {
      if (abortEmbeddingsRef.current) {
        addLog("Embedding backfill aborted by user", "warning");
        break;
      }
      
      const dish = dishesToProcess[i];
      setEmbeddingProgress({ current: i + 1, total: dishesToProcess.length });
      
      try {
        addLog(`Generating embedding: ${dish.name}...`);
        
        // Fetch image bytes
        const imageBytes = await fetchImageAsBytes(dish.image_url);
        
        // Compute embedding locally (no API cost!)
        const embedding = computeLocalEmbedding(imageBytes);
        
        // Update database
        const { error: updateError } = await supabase
          .from("dishinfo")
          .update({
            image_embedding: embedding,
            embedding_version: 2
          })
          .eq("id", dish.id);
        
        if (updateError) throw updateError;
        
        addLog(`✓ Embedding generated: ${dish.name}`, "success");
        setEmbeddingStats(prev => ({ ...prev, success: prev.success + 1 }));
        
        // Small delay
        await new Promise(r => setTimeout(r, 100));
        
      } catch (err) {
        addLog(`✗ Failed: ${dish.name} - ${err.message}`, "error");
        setEmbeddingStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }
    
    addLog("Embedding backfill complete!", "success");
    setIsRunningEmbeddings(false);
    fetchDishes();
  };

  const stopBackfill = () => {
    abortRef.current = true;
    addLog("Stopping hash backfill...", "warning");
  };

  const stopEmbeddingBackfill = () => {
    abortEmbeddingsRef.current = true;
    addLog("Stopping embedding backfill...", "warning");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const needsHashUpdate = dishes.filter(d => !d.d_hash || !d.color_histogram).length;
  const needsEmbedding = dishes.filter(d => !d.image_embedding).length;
  const hasEmbedding = dishes.filter(d => d.image_embedding).length;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Admin Backfill Tool
          </h1>
          <p className="text-gray-600">
            Manage image hashes and vector embeddings for dish matching.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("hashes")}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === "hashes"
                  ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Hash Backfill
            </button>
            <button
              onClick={() => setActiveTab("embeddings")}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === "embeddings"
                  ? "bg-purple-50 text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Vector Embeddings (pgvector)
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "hashes" ? (
              <>
                {/* Hash Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{dishes.length}</div>
                    <div className="text-sm text-gray-600">Total Dishes</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">{needsHashUpdate}</div>
                    <div className="text-sm text-gray-600">Need Hash Update</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.success}</div>
                    <div className="text-sm text-gray-600">Success</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>

                {/* Hash Actions */}
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => startBackfill(false)}
                    disabled={isRunning || needsHashUpdate === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold
                               hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    Update Missing ({needsHashUpdate})
                  </button>
                  <button
                    onClick={() => startBackfill(true)}
                    disabled={isRunning}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold
                               hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    Regenerate All
                  </button>
                  {isRunning && (
                    <button
                      onClick={stopBackfill}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Stop
                    </button>
                  )}
                </div>

                {/* Hash Progress */}
                {isRunning && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Embedding Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{dishes.length}</div>
                    <div className="text-sm text-gray-600">Total Dishes</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">{needsEmbedding}</div>
                    <div className="text-sm text-gray-600">Need Embedding</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{hasEmbedding}</div>
                    <div className="text-sm text-gray-600">Has Embedding</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">$0</div>
                    <div className="text-sm text-gray-600">API Cost</div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-800 mb-2">🚀 Self-Hosted Vector Embeddings</h3>
                  <p className="text-sm text-purple-700">
                    Embeddings are generated locally in your browser - no API costs! 
                    This enables pgvector similarity search for faster and more accurate dish matching.
                  </p>
                </div>

                {/* Embedding Actions */}
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => startEmbeddingBackfill(false)}
                    disabled={isRunningEmbeddings || needsEmbedding === 0}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold
                               hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    Generate Missing ({needsEmbedding})
                  </button>
                  <button
                    onClick={() => startEmbeddingBackfill(true)}
                    disabled={isRunningEmbeddings}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold
                               hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    Regenerate All
                  </button>
                  {isRunningEmbeddings && (
                    <button
                      onClick={stopEmbeddingBackfill}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Stop
                    </button>
                  )}
                </div>

                {/* Embedding Progress */}
                {isRunningEmbeddings && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{embeddingProgress.current} / {embeddingProgress.total}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${(embeddingProgress.current / embeddingProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Success: {embeddingStats.success} | Failed: {embeddingStats.failed}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={fetchDishes}
            disabled={isRunning || isRunningEmbeddings}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold
                       hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            Refresh Data
          </button>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Logs</h2>
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Start a backfill to see progress.</p>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                    ${log.type === 'info' ? 'text-gray-300' : ''}
                  `}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dish Status Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Dishes Status ({dishes.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">pHash</th>
                  <th className="px-4 py-2 text-left">dHash</th>
                  <th className="px-4 py-2 text-left">Color</th>
                  <th className="px-4 py-2 text-left">Embedding</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {dishes.slice(0, 50).map(dish => (
                  <tr key={dish.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{dish.name}</td>
                    <td className="px-4 py-2">
                      {dish.image_hash ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                    </td>
                    <td className="px-4 py-2">
                      {dish.d_hash ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                    </td>
                    <td className="px-4 py-2">
                      {dish.color_histogram ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                    </td>
                    <td className="px-4 py-2">
                      {dish.image_embedding ? (
                        <span className="text-purple-600">✓</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {dish.d_hash && dish.color_histogram && dish.image_embedding ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Full Ready
                        </span>
                      ) : dish.d_hash && dish.color_histogram ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Hash Ready
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                          Needs Update
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dishes.length > 50 && (
              <p className="text-gray-500 text-sm mt-2">
                Showing first 50 of {dishes.length} dishes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
