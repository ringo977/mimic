import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vfruyyrpriymhmelgidr.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcnV5eXJwcml5bWhtZWxnaWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTg5NTQsImV4cCI6MjA4NzQzNDk1NH0.LMp7GBjYR6hRiujRQmfYyQVlltnVORKDknwUM3QjaCQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
