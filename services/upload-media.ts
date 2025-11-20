import { baseInstance } from "~/utils/axios";

interface UploadFileValue {
  storage?: string;
  data?: string;
  type?: string;
  name?: string;
  originalName?: string;
  fileName?: string;
  uri?: string;
  url?: string;
  mimeType?: string;
  size?: number;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url: string;
  storage: 'url';
  _id: string;
}

export const uploadMedia = async (
  fileValue: UploadFileValue,
  fieldName: string,
  formId?: string,
  apiBaseUrl: string = '/api'
): Promise<UploadedFile> => {
  try {
    const uploadUrl = `${apiBaseUrl}/uploads`;
    
    // Extract filename
    let fileName = fileValue.name || fileValue.fileName;
    if (!fileName && fileValue.uri) {
      const uriParts = fileValue.uri.split('/');
      fileName = uriParts[uriParts.length - 1];
    }

    // Determine mime type
    const mimeType = fileValue.type || fileValue.mimeType || 'application/octet-stream';

    if (!fileValue.uri) {
      throw new Error('File URI is required for upload');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('fieldName', fieldName);
    if (formId) formData.append('formId', formId);
    
    // Append file - backend expects 'files' array
    formData.append('files', {
      uri: fileValue.uri,
      name: fileName || 'file',
      type: mimeType,
    } as any);

    console.log('=== UPLOAD DEBUG ===');
    console.log('Upload URL:', uploadUrl);
    console.log('Field name:', fieldName);
    console.log('Form ID:', formId);
    console.log('File name:', fileName);
    console.log('File type:', mimeType);
    console.log('File URI:', fileValue.uri);

    // DON'T set Content-Type - let axios handle it with boundary
    const response = await baseInstance.post(uploadUrl, formData, {
      timeout: 60000,
      transformRequest: (data, headers) => {
        // Let FormData set the Content-Type with proper boundary
        delete headers['Content-Type'];
        return data;
      },
    });

    const result = response.data;
    console.log('Upload successful:', result);

    if (result.success && result.files && result.files.length > 0) {
      const uploadedFile = result.files[0];
      
      // Construct full URL
      let fullUrl = uploadedFile.url;
      if (fullUrl && !fullUrl.startsWith('http')) {
        const baseUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
        const cleanUrl = fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;
        fullUrl = `${baseUrl}${cleanUrl}`;
      }

      console.log('Final file URL:', fullUrl);

      return {
        name: uploadedFile.originalName || uploadedFile.name || fileName,
        type: uploadedFile.mimetype || mimeType,
        size: uploadedFile.size || fileValue.size || 0,
        url: fullUrl,
        storage: 'url',
        _id: uploadedFile._id || uploadedFile.id || Date.now().toString(),
      };
    }

    throw new Error('No uploaded files returned from backend');
  } catch (err: any) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error:', err.message);
    console.error('Response data:', err.response?.data);
    console.error('Response status:', err.response?.status);
    console.error('Full error:', err);
    
    if (err.response?.status === 500) {
      const errorMsg = err.response?.data?.error || 'Server error during upload';
      throw new Error(`Server error: ${errorMsg}`);
    } else if (err.response?.status === 401) {
      throw new Error('Authentication required for this form');
    } else if (err.response?.status === 413) {
      throw new Error('File is too large. Please select a smaller file.');
    } else if (err.code === 'ECONNABORTED') {
      throw new Error('Upload timeout. Please check your connection and try again.');
    } else if (!err.response) {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw new Error(err.response?.data?.error || err.message || 'Upload failed');
  }
};