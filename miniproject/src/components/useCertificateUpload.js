import { useState } from 'react';
import { supabase } from '../supabase'; // Ensure you have this import
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names

// Custom hook for certificate upload
export const useCertificateUpload = (studentId) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Function to upload a file to Supabase Storage and save reference in certificates table
  const uploadCertificate = async (file) => {
    if (!file || !studentId) {
      setError('Missing file or student ID');
      return null;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // 1. Generate a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `certificates/${studentId}/${fileName}`;
      
      // 2. Upload file to Supabase Storage bucket
      const { data: storageData, error: storageError } = await supabase.storage
        .from('certificates') // Your bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
        
      if (storageError) {
        setError(storageError.message);
        return null;
      }
      
      // 3. Save the file reference in the certificates table
      const { data: certificateData, error: certificateError } = await supabase
        .from('certificates')
        .insert([{
          id: studentId, // UUID of the student
          certificate: filePath, // Path to the file in storage
          status: 'Pending', // Default status
          // activity_point will use the default value set in the schema (10)
        }])
        .select();
        
      if (certificateError) {
        setError(certificateError.message);
        // Delete the uploaded file if database insertion fails
        await supabase.storage.from('certificates').remove([filePath]);
        return null;
      }
      
      // 4. Return the uploaded certificate data
      const uploadedCertificate = {
        id: certificateData[0].certificate_id,
        name: file.name,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        path: filePath
      };
      
      setUploadedFiles(prev => [...prev, uploadedCertificate]);
      return uploadedCertificate;
      
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Function to upload multiple files
  const uploadMultipleCertificates = async (files) => {
    const results = [];
    const errors = [];
    
    for (const file of files) {
      const result = await uploadCertificate(file);
      if (result) {
        results.push(result);
      } else {
        errors.push({ fileName: file.name, error: error });
      }
    }
    
    return { uploaded: results, errors };
  };
  
  // Function to get the public URL of a certificate
  const getCertificateUrl = (filePath) => {
    if (!filePath) return null;
    
    const { data } = supabase.storage
      .from('certificates')
      .getPublicUrl(filePath);
      
    return data?.publicUrl || null;
  };
  
  // Function to fetch all certificates for a student
  const fetchStudentCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', studentId)
        .order('uploaded_at', { ascending: false });
        
      if (error) {
        setError(error.message);
        return [];
      }
      
      // Transform the data to include public URLs
      const certificatesWithUrls = data.map(cert => ({
        id: cert.certificate_id,
        name: cert.certificate.split('/').pop(), // Extract file name from path
        date: new Date(cert.uploaded_at).toISOString().split('T')[0],
        status: cert.status,
        points: cert.activity_point,
        path: cert.certificate,
        url: getCertificateUrl(cert.certificate)
      }));
      
      setUploadedFiles(certificatesWithUrls);
      return certificatesWithUrls;
      
    } catch (error) {
      setError(error.message);
      return [];
    }
  };
  
  // Function to delete a certificate
  const deleteCertificate = async (certificateId, filePath) => {
    try {
      // 1. Delete the record from the certificates table
      const { error: dbError } = await supabase
        .from('certificates')
        .delete()
        .eq('certificate_id', certificateId);
        
      if (dbError) {
        setError(dbError.message);
        return false;
      }
      
      // 2. Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('certificates')
        .remove([filePath]);
        
      if (storageError) {
        setError(storageError.message);
        return false;
      }
      
      // 3. Update the local state
      setUploadedFiles(prev => prev.filter(file => file.id !== certificateId));
      return true;
      
    } catch (error) {
      setError(error.message);
      return false;
    }
  };
  
  return {
    uploadCertificate,
    uploadMultipleCertificates,
    getCertificateUrl,
    fetchStudentCertificates,
    deleteCertificate,
    uploadedFiles,
    isUploading,
    uploadProgress,
    error
  };
};