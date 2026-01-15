
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwvyihhczamvfxtsjqsm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dnlpaGhjemFtdmZ4dHNqcXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzODk3MTIsImV4cCI6MjA4Mzk2NTcxMn0.GObAHQqeFjK8jjweslQDG5iYN29SYbhLW44gYTKKuaQ';

export const isSupabaseConfigured = () => true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
