import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

// Asset configuration
const ASSETS_CONFIG = [
  { 
    require: require("~/assets/formio/formio.full.min.js"), 
    filename: "formio.full.min.js",
    critical: true 
  },
  { 
    require: require("~/assets/formio/formio.full.min.css"), 
    filename: "formio.full.min.css",
    critical: true 
  },
  { 
    require: require("~/assets/formio/bootstrap.min.css"), 
    filename: "bootstrap.min.css",
    critical: false // Can fallback to CDN if needed
  },
];

// Check if all assets exist
export const checkExistingAssets = async (): Promise<boolean> => {
  try {
    const checks = ASSETS_CONFIG.map(async (asset) => {
      const path = `${FileSystem.documentDirectory}${asset.filename}`;
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    });

    const results = await Promise.all(checks);
    return results.every(exists => exists);
  } catch (error) {
    console.error("Error checking existing assets:", error);
    return false;
  }
};

// Copy a single asset with retry logic
const copySingleAsset = async (
  assetInfo: typeof ASSETS_CONFIG[0],
  onProgress?: (filename: string, status: string) => void,
  maxRetries = 3
): Promise<boolean> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.(assetInfo.filename, `Downloading (${attempt}/${maxRetries})...`);
      
      // Load asset from bundle
      const asset = Asset.fromModule(assetInfo.require);
      
      // Check if already downloaded
      if (!asset.downloaded) {
        await asset.downloadAsync();
      }
      
      if (!asset.localUri) {
        throw new Error(`Asset localUri is null for ${assetInfo.filename}`);
      }

      onProgress?.(assetInfo.filename, "Copying to storage...");
      
      const destinationPath = `${FileSystem.documentDirectory}${assetInfo.filename}`;
      
      // Copy to permanent storage
      await FileSystem.copyAsync({
        from: asset.localUri,
        to: destinationPath,
      });

      // Verify the copy succeeded
      const info = await FileSystem.getInfoAsync(destinationPath);
      if (!info.exists) {
        throw new Error(`Failed to verify copied file: ${assetInfo.filename}`);
      }

      onProgress?.(assetInfo.filename, "✓ Ready");
      console.log(`Successfully copied ${assetInfo.filename} (attempt ${attempt})`);
      return true;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Error copying ${assetInfo.filename} (attempt ${attempt}):`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All retries failed
  console.error(`Failed to copy ${assetInfo.filename} after ${maxRetries} attempts:`, lastError);
  
  // If it's not critical, we can continue
  if (!assetInfo.critical) {
    console.warn(`Skipping non-critical asset: ${assetInfo.filename}`);
    return false;
  }
  
  throw lastError;
};

// Copy all assets in parallel with progress tracking
export const copyBundledAssets = async (
  onProgress?: (filename: string, status: string) => void
): Promise<void> => {
  console.log("Starting parallel asset copy...");
  
  try {
    // Copy all assets in parallel for much faster loading
    const copyPromises = ASSETS_CONFIG.map(asset => 
      copySingleAsset(asset, onProgress)
    );
    
    await Promise.all(copyPromises);
    console.log("All assets copied successfully");
    
  } catch (error) {
    console.error("Error copying bundled assets:", error);
    throw error;
  }
};

// Main setup function with caching and progress
export const setupAndLoadAssets = async (
  onProgress?: (filename: string, status: string) => void
): Promise<boolean> => {
  try {
    onProgress?.("system", "Checking cached assets...");
    
    // Quick check if assets already exist
    const filesExist = await checkExistingAssets();
    
    if (filesExist) {
      console.log("✓ Using existing cached assets");
      onProgress?.("system", "✓ Using cached assets");
      return true;
    }

    console.log("Assets not found, downloading...");
    onProgress?.("system", "Downloading assets...");
    
    // Copy assets with progress tracking
    await copyBundledAssets(onProgress);
    
    // Verify all critical assets were copied
    const allCopied = await checkExistingAssets();
    
    if (!allCopied) {
      console.warn("Some assets may be missing, but continuing...");
    }
    
    return true;
    
  } catch (error) {
    console.error("Error in setupAndLoadAssets:", error);
    // Return true to allow fallback to CDN
    return true;
  }
};

// Clear cached assets (useful for debugging)
export const clearCachedAssets = async (): Promise<void> => {
  try {
    const deletePromises = ASSETS_CONFIG.map(async (asset) => {
      const path = `${FileSystem.documentDirectory}${asset.filename}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    });
    
    await Promise.all(deletePromises);
    console.log("Cached assets cleared");
  } catch (error) {
    console.error("Error clearing cached assets:", error);
  }
};