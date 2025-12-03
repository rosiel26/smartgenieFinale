-- Add color_histogram column to dishinfo for enhanced image matching
-- Stores 24-value array (8 bins x 3 RGB channels) as JSONB

ALTER TABLE dishinfo 
ADD COLUMN IF NOT EXISTS color_histogram JSONB;

-- Add d_hash column for difference hash (edge-based matching)
ALTER TABLE dishinfo 
ADD COLUMN IF NOT EXISTS d_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dishinfo_image_hash ON dishinfo(image_hash);

-- Add comment explaining the columns
COMMENT ON COLUMN dishinfo.color_histogram IS 'Color histogram (24 values: 8 bins x RGB) for color-based image matching';
COMMENT ON COLUMN dishinfo.d_hash IS 'Difference hash (64-bit) for edge-based image matching';

