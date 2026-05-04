-- Créditos bonus Radar NDVI (sumados al límite mensual base en la función Netlify).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS radar_credits_bonus integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.radar_credits_bonus IS 'Créditos extra mensuales Radar (admin). Se suman a RADAR_MONTHLY_CREDITS (env).';
