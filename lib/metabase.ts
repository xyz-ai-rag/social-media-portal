import jwt from 'jsonwebtoken';

interface MetabaseParams {
  [key: string]: any;
}

/**
 * Generate a JWT token for securely embedding Metabase dashboards
 * 
 * @param dashboardId - The ID of the Metabase dashboard to embed
 * @param params - Additional parameters to pass to Metabase
 * @returns The signed JWT token
 */
export function generateMetabaseToken(dashboardId: number, params: MetabaseParams = {}): string {
  const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
  const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;
  
  if (!METABASE_SITE_URL || !METABASE_SECRET_KEY) {
    throw new Error('Metabase configuration is missing. Please set METABASE_SITE_URL and METABASE_SECRET_KEY in .env.local');
  }

  // The payload for the JWT
  const payload = {
    resource: { dashboard: dashboardId },
    params: params,
    exp: Math.round(Date.now() / 1000) + (10 * 60) // Token expires in 10 minutes
  };

  // Sign the token with the Metabase secret key
  return jwt.sign(payload, METABASE_SECRET_KEY);
}

/**
 * Generate the iframe URL for a Metabase dashboard
 * 
 * @param dashboardId - The ID of the Metabase dashboard to embed
 * @param params - Additional parameters to pass to Metabase
 * @returns The complete iframe URL
 */
export function getMetabaseEmbedUrl(dashboardId: number, params: MetabaseParams = {}): string {
  const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
  const token = generateMetabaseToken(dashboardId, params);
  
  return `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
}