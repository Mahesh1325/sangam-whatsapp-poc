require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN || 'sangam_poc_verify_2026',
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  GRAPH_API_VERSION: process.env.GRAPH_API_VERSION || 'v21.0',
  FLOW_ID: process.env.FLOW_ID || '123456789012345',
  FLOW_MODE: process.env.FLOW_MODE || 'published',
  JWT_SECRET: process.env.JWT_SECRET || 'sangam_super_secure_jwt_secret_2026',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  get GRAPH_URL() {
    return `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${this.PHONE_NUMBER_ID}/messages`;
  },
};
