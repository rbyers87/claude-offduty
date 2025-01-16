// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { PDFField } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveFields(templateId: string, fields: PDFField[]) {
  try {
    // Delete existing fields
    const { error: deleteError } = await supabase
      .from('pdf_fields')
      .delete()
      .eq('template_id', templateId);

    if (deleteError) {
      throw new Error(`Failed to delete existing fields: ${deleteError.message}`);
    }

    // Prepare fields with proper timestamps
    const fieldsToInsert = fields.map(field => ({
      ...field,
      template_id: templateId,
      updated_at: new Date().toISOString(),
    }));

    // Insert new fields
    const { error: insertError } = await supabase
      .from('pdf_fields')
      .insert(fieldsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert new fields: ${insertError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving fields:', error);
    throw error;
  }
}

export async function loadFields(templateId: string) {
  try {
    const { data, error } = await supabase
      .from('pdf_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error loading fields:', error);
    throw error;
  }
}

export async function getPdfSignedUrl(fileUrl: string): Promise<string> {
  try {
    const filePathMatch = fileUrl.match(/pdf-templates\/(.+)$/);
    if (!filePathMatch) {
      throw new Error('Invalid file URL format');
    }

    const filePath = filePathMatch[1];
    const { data, error } = await supabase.storage
      .from('pdf-templates')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error('Failed to generate signed URL');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}
