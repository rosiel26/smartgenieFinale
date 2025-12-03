import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import cacheService from "../services/cacheService";
import { computeImageFeatures } from "../utils/imageMatching";

// Image feature extraction is now handled by imageMatching.js

export default function AnalyzePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Hide scrollbar on this page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const steps = [
    "Analyzing...",
    "Identifying dish components",
    "Calculating nutrition facts",
    "Generating insights",
    "This may take a few seconds...",
  ];

  useEffect(() => {
    const stateImage = location.state?.image;
    if (stateImage) {
      setImageSrc(stateImage);
      analyzeImage(stateImage);
    } else {
      navigate("/", { replace: true });
    }
  }, [location.state]);

  /**
   * Normalize image to standard format using Canvas
   * This ensures consistent pixel data regardless of source format
   */
  const normalizeImage = (imageSrc) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          
          // Convert to standard JPEG format for consistency
          const normalizedBase64 = canvas.toDataURL("image/jpeg", 0.92);
          resolve(normalizedBase64);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  const analyzeImage = async (base64Image) => {
    setIsAnalyzing(true);
    setError(null);
    setStepIndex(0);
    setProgress(0);

    try {
      // Check cache first
      const cachedResult = cacheService.getCachedScanResult(base64Image);
      if (cachedResult) {
        console.log('Using cached result');
        setStepIndex(steps.length - 1);
        setProgress(100);

        const { data: { user } } = await supabase.auth.getUser();
        navigate("/result", {
          state: {
            dishId: cachedResult.bestMatch.id,
            imageSrc: base64Image,
            accuracy: cachedResult.bestMatch.confidence,
            allMatches: cachedResult.matches,
            isLoggedIn: !!user,
          },
        });
        return;
      }

      // Step 1: Normalize image to ensure consistent pixel data
      setStepIndex(0);
      setProgress(10);
      
      let normalizedImage = base64Image;
      try {
        normalizedImage = await normalizeImage(base64Image);
        console.log('Image normalized successfully');
      } catch (normError) {
        console.warn('Image normalization failed, using original:', normError);
      }
      
      // Step 2: Extract image features client-side (most accurate)
      setProgress(20);
      
      let features = null;
      let featureError = null;
      
      try {
        features = await computeImageFeatures(normalizedImage);
        console.log('Extracted features:', { 
          pHashLength: features.pHash?.length, 
          dHashLength: features.dHash?.length,
          colorBins: features.colorHist?.length,
          brightness: features.brightness 
        });
      } catch (err) {
        featureError = err;
        if (err.message === "TOO_DARK") {
          throw new Error("Image is too dark. Please retake with better lighting.");
        }
        if (err.message === "TOO_BRIGHT") {
          throw new Error("Image is overexposed. Please retake with less light.");
        }
        console.warn('Client-side feature extraction failed:', err);
      }

      // Step 3: Match against database
      setStepIndex(1);
      setProgress(40);
      await new Promise((r) => setTimeout(r, 100));

      // Step 4: Calculate nutrition
      setStepIndex(2);
      setProgress(60);

      const { data: { user } } = await supabase.auth.getUser();

      // Send to Edge Function - ALWAYS include features if available
      // Features are computed from decoded pixels via Canvas, which is accurate
      const requestBody = {
        imageData: normalizedImage,
        features: features ? {
          pHash: features.pHash,
          dHash: features.dHash,
          colorHist: features.colorHist
        } : null
      };
      
      console.log('Sending to server with features:', !!features);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-dish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      setStepIndex(3);
      setProgress(80);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      const bestMatch = result.bestMatch;
      if (!bestMatch) {
        throw new Error("No matching dish found in database.");
      }

      setStepIndex(4);
      setProgress(100);

      // Cache the result for future use
      cacheService.cacheScanResult(base64Image, result);

      navigate("/result", {
        state: {
          dishId: bestMatch.id,
          imageSrc: base64Image,
          accuracy: bestMatch.confidence,
          allMatches: result.matches,
          isLoggedIn: !!user,
        },
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-50 p-4">
      <div className="w-[380px] h-[680px] rounded-2xl shadow-2xl p-6 flex flex-col overflow-hidden bg-white relative">
        {/* Image Preview */}
        <div className="relative w-full h-[250px] rounded-xl overflow-hidden flex items-center justify-center mb-5 shadow-md">
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Scanned"
              className="w-full h-full object-cover rounded-xl"
            />
          )}
          {isAnalyzing && (
            <motion.div
              className="absolute left-0 w-full h-[3px] bg-green-600/90 blur-md shadow-xl"
              style={{ top: 0 }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </div>

        {/* Progress Circle + Step */}
        {isAnalyzing && (
          <div className="flex flex-col items-center flex-grow justify-center gap-6 relative -mt-8">
            {/* Circle */}
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="#22c55e"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 50 * (1 - progress / 100),
                  }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-green-600 text-xl">
                {progress}%
              </span>
            </div>

            {/* Step Text */}
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-center text-gray-800 font-medium text-sm"
            >
              {steps[stepIndex]}
            </motion.div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-600 font-semibold mt-4 text-center px-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
