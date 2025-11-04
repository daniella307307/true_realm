export const CREATE_SURVEY_SUBMISSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS SurveySubmissions (
    _id TEXT PRIMARY KEY,
    id INTEGER,
    answers TEXT,
    form_data TEXT,
    location TEXT,
    table_name TEXT,
    name TEXT,
    name_kin TEXT,
    slug TEXT,
    json2 TEXT,
    post_data TEXT,
    loads TEXT,
    time_spent TEXT,
    user_id TEXT,
    is_primary BOOLEAN,
    project_module_id INTEGER,
    source_module_id INTEGER,
    project_id INTEGER,
    survey_status INTEGER,
    fetch_data TEXT,
    prev_id TEXT,
    order_list INTEGER,
    survey_id INTEGER,
    sync_data TEXT,
    created_by_user_id TEXT,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    is_modified BOOLEAN,
    needs_update_sync BOOLEAN,
    last_modified_at TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_survey_user ON SurveySubmissions(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_survey_sync ON SurveySubmissions(sync_status);
  CREATE INDEX IF NOT EXISTS idx_survey_remote_id ON SurveySubmissions(id);
`;

// ============================================================================
// PAGINATION TYPES & CONSTANTS
// ============================================================================

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

const ITEMS_PER_PAGE = 100;
const CACHE_KEY_PREFIX = 'submissions_page_';
const METADATA_KEY = 'submissions_metadata';

/**
 * Store pagination metadata in localStorage
 */
const savePaginationMetadata = async (
  create: any,
  metadata: PaginationMetadata
): Promise<void> => {
  try {
    await create('AppMetadata', {
      _id: METADATA_KEY,
      data: JSON.stringify(metadata),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving pagination metadata:', error);
  }
};

/**
 * Retrieve pagination metadata from localStorage
 */
const getPaginationMetadata = async (
  getAll: any
): Promise<PaginationMetadata | null> => {
  try {
    const allMetadata = await getAll('AppMetadata');
    const metadata = allMetadata.find((m: any) => m._id === METADATA_KEY);
    
    if (metadata?.data) {
      return JSON.parse(metadata.data);
    }
    return null;
  } catch (error) {
    console.error('Error getting pagination metadata:', error);
    return null;
  }
};

/**
 * Check which pages are already cached locally
 */
const getCachedPages = async (getAll: any): Promise<Set<number>> => {
  try {
    const allMetadata = await getAll('AppMetadata');
    const cachedPages = new Set<number>();
    
    allMetadata.forEach((item: any) => {
      if (item._id?.startsWith(CACHE_KEY_PREFIX)) {
        const pageNum = parseInt(item._id.replace(CACHE_KEY_PREFIX, ''));
        if (!isNaN(pageNum)) {
          cachedPages.add(pageNum);
        }
      }
    });
    
    return cachedPages;
  } catch (error) {
    console.error('Error getting cached pages:', error);
    return new Set();
  }
};

/**
 * Mark a page as cached
 */
const markPageAsCached = async (
  create: any,
  pageNumber: number
): Promise<void> => {
  try {
    await create('AppMetadata', {
      _id: `${CACHE_KEY_PREFIX}${pageNumber}`,
      data: JSON.stringify({ cached: true, cachedAt: new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking page as cached:', error);
  }
};


export const getPendingSubmissionsCount = async (
  query: any,
  userId: number
): Promise<number> => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM SurveySubmissions WHERE sync_status = 0 AND created_by_user_id = ?`,
      [userId]
    );
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Error getting pending count:", error);
    return 0;
  }
};

import { isOnline } from "./network";
import { baseInstance } from "~/utils/axios";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TFunction } from "i18next";
import { useAuth } from "~/lib/hooks/useAuth";

interface FormField {
  key: string;
  type: string;
}

export interface SurveySubmission {
  _id?: string;
  id?: string | null;
  data: Record<string, any>;
  form_data: Record<string, any>;
  location: Record<string, any>;
  sync_data?: Record<string, any>;
  created_by_user_id: string;
  sync_status: number;
  sync_reason: string;
  sync_attempts: number;
  created_at: string;
  updated_at: string;
  is_modified: boolean;
  needs_update_sync: boolean;
  last_modified_at?: string;
  form?: any;
}

enum SyncType {
  survey_submissions = 'survey_submissions'
}


const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const cleanObject = (obj: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  );
};



const prepareApiPayload = (submission: SurveySubmission, formId: string) => {
  return {
    form: formId,
    data: submission.data,
    location: submission.location,
    metadata: {
      ...submission.form_data,
      time_spent_filling_the_form: submission.form_data.time_spent_filling_the_form,
      submitted_at: submission.created_at,
    },
  };
};

/**
 * Fetch submissions from API and transform to local SQLite format
 * Maps the 'data' field to 'answers' column properly
 */
// export const fetchSurveySubmissionsFromRemote = async (userId?: string,isLoggedIn?:boolean): Promise<any[]> => {
//  if(!isLoggedIn){
//     return [];
//   }
//   try {
     
//     console.log("Fetching survey submissions from remote API...");
//     const res = await baseInstance.get("/submissions/filter");
    
//     const submissions = Array.isArray(res.data?.data?.submissions) 
//       ? res.data.data.submissions 
//       : [];
   
//     console.log(`Received ${submissions.length} submissions from API`);

//     // Optional: filter by userId if provided
//     // const filteredSubmissions = userId
//     //   ? submissions.filter((sub: any) => sub.submitter?._id === userId)
//     //   : submissions;

//     // console.log(`Filtered to ${filteredSubmissions.length} submissions for user ${userId}`);

//     // Transform submissions into SQLite row format (not SurveySubmission format)
//     // This ensures the column names match the database schema
//     const transformed = submissions.map((sub: any) => {
//       const data = sub.data ?? {};
//       const form = sub.form ?? {};
//       const submitter = sub.submitter ?? {};

//       const formData = {
//         survey_id: form._id ?? null,
//         user_id: submitter.id ?? null,
//         table_name: form.title ?? null,
//         project_module_id: null,
//         source_module_id: null,
//         project_id: null,
//         post_data: null,
//         izucode: null,
//         family: null,
//         form_status: sub.status ?? "submitted",
//         cohorts: null,
//       };

//       const syncData = {
//         sync_status: true,
//         sync_reason: "From API",
//         sync_attempts: 1,
//         last_sync_attempt: new Date(sub.updatedAt ?? sub.createdAt).toISOString(),
//         submitted_at: new Date(sub.createdAt ?? Date.now()).toISOString(),
//         sync_type: "survey_submissions",
//         created_by_user_id: submitter.id ?? null,
//       };

//       // Return SQLite row format with correct column names
//       return {
//         _id: `remote-${sub._id}`,
//         id: sub._id,
//         answers: JSON.stringify(data), // ✅ Use 'answers' not 'data'
//         form_data: JSON.stringify(formData),
//         location: JSON.stringify({}),
//         sync_data: JSON.stringify(syncData),
//         created_by_user_id: submitter.id ?? null,
//         sync_status: 1,
//         sync_reason: "From API",
//         sync_attempts: 1,
//         created_at: sub.createdAt ?? new Date().toISOString(),
//         updated_at: sub.updatedAt ?? new Date().toISOString(),
//         is_modified: 0,
//         needs_update_sync: 0,
//         last_modified_at: null,
//         // Add other columns that might be in your schema
//         table_name: null,
//         name: null,
//         name_kin: null,
//         slug: null,
//         json2: null,
//         post_data: null,
//         loads: null,
//         time_spent: null,
//         user_id: null,
//         is_primary: 0,
//         project_module_id: null,
//         source_module_id: null,
//         project_id: null,
//         survey_status: null,
//         fetch_data: null,
//         prev_id: null,
//         order_list: null,
//         survey_id: null,
//         sync_type: "survey_submissions",
//       };
//     });

//     console.log(`Transformed ${transformed.length} submissions`);
//     return transformed;
//   } catch (error) {
//     console.error("Failed to fetch and transform submissions:", error);
//     return [];
//   }
// };
/**
 * Fetch submissions from remote API with pagination
 */
export const fetchSubmissionsFromRemote= async (
  page: number = 1,
  limit: number = ITEMS_PER_PAGE,
  userId?: string,
  isLoggedIn?: boolean
): Promise<PaginatedResponse<any>> => {
  if (!isLoggedIn) {
    return {
      data: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  try {
    console.log(`Fetching page ${page} with ${limit} items...`);
    
    // Make API call with pagination parameters
    const res = await baseInstance.get('/submissions/filter', {
      params: {
        page,
        limit
      },
    });

    const submissions = Array.isArray(res.data?.data?.submissions)
      ? res.data.data.submissions
      : [];

    // Extract pagination metadata from API response
    const pagination: PaginationMetadata = {
      currentPage: res.data?.data?.pagination?.currentPage || page,
      totalPages: res.data?.data?.pagination?.totalPages || 1,
      totalItems: res.data?.data?.pagination?.totalItems || submissions.length,
      itemsPerPage: limit,
      hasNextPage: res.data?.data?.pagination?.hasNextPage || false,
      hasPreviousPage: res.data?.data?.pagination?.hasPreviousPage || false,
    };

    console.log(`Received ${submissions.length} submissions for page ${page}`);
    console.log('Pagination:', pagination);

    // Transform submissions
    const transformed = submissions.map((sub: any) => {
      const data = sub.data ?? {};
      const form = sub.form ?? {};
      const submitter = sub.submitter ?? {};

      const formData = {
        survey_id: form._id ?? null,
        user_id: submitter.id ?? null,
        table_name: form.title ?? null,
        project_module_id: null,
        source_module_id: null,
        project_id: null,
        post_data: null,
        izucode: null,
        family: null,
        form_status: sub.status ?? 'submitted',
        cohorts: null,
      };

      const syncData = {
        sync_status: true,
        sync_reason: 'From API',
        sync_attempts: 1,
        last_sync_attempt: new Date(sub.updatedAt ?? sub.createdAt).toISOString(),
        submitted_at: new Date(sub.createdAt ?? Date.now()).toISOString(),
        sync_type: 'survey_submissions',
        created_by_user_id: submitter.id ?? null,
      };

      return {
        _id: `remote-${sub._id}`,
        id: sub._id,
        answers: JSON.stringify(data),
        form_data: JSON.stringify(formData),
        location: JSON.stringify({}),
        sync_data: JSON.stringify(syncData),
        created_by_user_id: submitter.id ?? null,
        sync_status: 1,
        sync_reason: 'From API',
        sync_attempts: 1,
        created_at: sub.createdAt ?? new Date().toISOString(),
        updated_at: sub.updatedAt ?? new Date().toISOString(),
        is_modified: 0,
        needs_update_sync: 0,
        last_modified_at: null,
        table_name: null,
        name: null,
        name_kin: null,
        slug: null,
        json2: null,
        post_data: null,
        loads: null,
        time_spent: null,
        user_id: null,
        is_primary: 0,
        project_module_id: null,
        source_module_id: null,
        project_id: null,
        survey_status: null,
        fetch_data: null,
        prev_id: null,
        order_list: null,
        survey_id: null,
        sync_type: 'survey_submissions',
      };
    });

    return {
      data: transformed,
      pagination,
    };
  } catch (error) {
    console.error('Failed to fetch paginated submissions:', error);
    return {
      data: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
};

// ============================================================================
// SYNC PAGINATED SUBMISSIONS TO LOCAL DATABASE
// ============================================================================

/**
 * Sync a specific page of submissions to local database
 */
export const syncPageToLocal = async (
  create: any,
  update: any,
  page: number = 1,
  userId?: string,
  isLoggedIn?: boolean
): Promise<{ success: boolean; itemsSynced: number; pagination: PaginationMetadata }> => {
  try {
    console.log(`Syncing page ${page} to local database...`);

    // Fetch the page from API
    const response = await fetchSubmissionsFromRemote(
      page,
      ITEMS_PER_PAGE,
      userId,
      isLoggedIn
    );

    if (response.data.length === 0) {
      console.log('No submissions to sync');
      return {
        success: true,
        itemsSynced: 0,
        pagination: response.pagination,
      };
    }

    // Store each submission in local database
    let synced = 0;
    for (const submission of response.data) {
      try {
        // Check if submission already exists
        const exists = await update('SurveySubmissions', submission._id, submission);
        
        if (!exists) {
          // Create new if doesn't exist
          await create('SurveySubmissions', submission);
        }
        
        synced++;
      } catch (error) {
        console.error(`Failed to store submission ${submission._id}:`, error);
      }
    }

    // Mark this page as cached
    await markPageAsCached(create, page);

    // Save pagination metadata
    await savePaginationMetadata(create, response.pagination);

    console.log(`Successfully synced ${synced} submissions from page ${page}`);

    return {
      success: true,
      itemsSynced: synced,
      pagination: response.pagination,
    };
  } catch (error) {
    console.error(`Error syncing page ${page}:`, error);
    return {
      success: false,
      itemsSynced: 0,
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: ITEMS_PER_PAGE,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
};

// ============================================================================
// INITIAL SYNC (FIRST 100 SUBMISSIONS)
// ============================================================================

/**
 * Perform initial sync of first 100 submissions
 */
export const performInitialSync = async (
  create: any,
  update: any,
  userId?: string,
  isLoggedIn?: boolean
): Promise<{ success: boolean; itemsSynced: number }> => {
  try {
    console.log('Starting initial sync of first 100 submissions...');

    const result = await syncPageToLocal(create, update, 1, userId, isLoggedIn);

    if (result.success) {
      console.log(`Initial sync completed: ${result.itemsSynced} submissions synced`);
      return {
        success: true,
        itemsSynced: result.itemsSynced,
      };
    }

    return {
      success: false,
      itemsSynced: 0,
    };
  } catch (error) {
    console.error('Initial sync failed:', error);
    return {
      success: false,
      itemsSynced: 0,
    };
  }
};

// ============================================================================
// LOAD MORE SUBMISSIONS (NEXT PAGE)
// ============================================================================

/**
 * Load the next page of submissions
 */
export const loadNextPage = async (
  create: any,
  update: any,
  getAll: any,
  userId?: string,
  isLoggedIn?: boolean
): Promise<{
  success: boolean;
  itemsSynced: number;
  pagination: PaginationMetadata | null;
  fromCache: boolean;
}> => {
  try {
    // Get current pagination metadata
    const metadata = await getPaginationMetadata(getAll);
    
    if (!metadata) {
      console.log('No metadata found, performing initial sync...');
      const result = await performInitialSync(create, update, userId, isLoggedIn);
      
      // Get updated metadata after initial sync
      const newMetadata = await getPaginationMetadata(getAll);
      
      return {
        success: result.success,
        itemsSynced: result.itemsSynced,
        pagination: newMetadata,
        fromCache: false,
      };
    }

    const nextPage = metadata.currentPage + 1;

    // Check if next page exists
    if (!metadata.hasNextPage) {
      console.log('No more pages to load');
      return {
        success: true,
        itemsSynced: 0,
        pagination: metadata,
        fromCache: false,
      };
    }

    // Check if this page is already cached
    const cachedPages = await getCachedPages(getAll);
    
    if (cachedPages.has(nextPage)) {
      console.log(`Page ${nextPage} already cached locally`);
      return {
        success: true,
        itemsSynced: 0,
        pagination: { ...metadata, currentPage: nextPage },
        fromCache: true,
      };
    }

    // Fetch and sync next page
    const result = await syncPageToLocal(create, update, nextPage, userId, isLoggedIn);

    return {
      success: result.success,
      itemsSynced: result.itemsSynced,
      pagination: result.pagination,
      fromCache: false,
    };
  } catch (error) {
    console.error('Error loading next page:', error);
    return {
      success: false,
      itemsSynced: 0,
      pagination: null,
      fromCache: false,
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current pagination status
 */
export const getPaginationStatus = async (
  getAll: any
): Promise<{
  metadata: PaginationMetadata | null;
  cachedPages: number[];
  totalCached: number;
}> => {
  try {
    const metadata = await getPaginationMetadata(getAll);
    const cachedPages = await getCachedPages(getAll);
    
    return {
      metadata,
      cachedPages: Array.from(cachedPages).sort((a, b) => a - b),
      totalCached: cachedPages.size * ITEMS_PER_PAGE,
    };
  } catch (error) {
    console.error('Error getting pagination status:', error);
    return {
      metadata: null,
      cachedPages: [],
      totalCached: 0,
    };
  }
};

/**
 * Clear all cached pagination data
 */
export const clearPaginationCache = async (
  deleteFunc: any,
  getAll: any
): Promise<void> => {
  try {
    console.log('Clearing pagination cache...');
    
    const allMetadata = await getAll('AppMetadata');
    
    for (const item of allMetadata) {
      if (
        item._id === METADATA_KEY ||
        item._id?.startsWith(CACHE_KEY_PREFIX)
      ) {
        await deleteFunc('AppMetadata', item._id);
      }
    }
    
    console.log('Pagination cache cleared');
  } catch (error) {
    console.error('Error clearing pagination cache:', error);
  }
}

/**
 * Updated toSQLiteRow that properly maps data to answers column
 */
export const toSQLiteRow = (submission: SurveySubmission): Record<string, any> => {
  const safeStringify = (value: any): string => {
    if (value === null || value === undefined) {
      return JSON.stringify({});
    }
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value));
      } catch {
        return JSON.stringify({});
      }
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return JSON.stringify({});
  };
  
  return {
    _id: submission._id,
    id: submission.id,
    answers: safeStringify(submission.data), // ✅ Map data to answers
    form_data: safeStringify(submission.form_data),
    location: safeStringify(submission.location),
    sync_data: safeStringify(submission.sync_data),
    created_by_user_id: submission.created_by_user_id,
    sync_status: submission.sync_status ? 1 : 0,
    sync_reason: submission.sync_reason || "",
    sync_attempts: submission.sync_attempts || 0,
    created_at: submission.created_at || new Date().toISOString(),
    updated_at: submission.updated_at || new Date().toISOString(),
    is_modified: submission.is_modified ? 1 : 0,
    needs_update_sync: submission.needs_update_sync ? 1 : 0,
    last_modified_at: submission.last_modified_at || null,
    // Add other columns with null defaults
    table_name: null,
    name: null,
    name_kin: null,
    slug: null,
    json2: null,
    post_data: null,
    loads: null,
    time_spent: null,
    user_id: null,
    is_primary: 0,
    project_module_id: null,
    source_module_id: null,
    project_id: null,
    survey_status: null,
    fetch_data: null,
    prev_id: null,
    order_list: null,
    survey_id: null,
    sync_type: submission.sync_data?.sync_type || "survey_submissions",
  };
};

/**
 * Updated parseSQLiteRow - maps answers column back to data field
 */
export const parseSQLiteRow = (row: any): SurveySubmission => {
  const safeParse = (value: any) => {
    if (value === null || value === undefined) {
      return {};
    }
    
    if (typeof value === 'object') {
      return value;
    }
    
    if (typeof value === 'string') {
      if (value.trim() === '') {
        return {};
      }
      
      try {
        return JSON.parse(value);
      } catch (err) {
        console.warn("Failed to parse JSON string:", value.substring(0, 50) + "...");
        return {};
      }
    }
    
    return {};
  };

  return {
    ...row,
    data: safeParse(row.answers), // ✅ Map answers to data
    form_data: safeParse(row.form_data),
    location: safeParse(row.location),
    sync_data: safeParse(row.sync_data),
    is_modified: Boolean(row.is_modified),
    needs_update_sync: Boolean(row.needs_update_sync),
  };
};

/**
 * Transform API responses to SQLite row format (not SurveySubmission format)
 * This ensures column names match the database schema
 */
export const transformApiSurveySubmissions = (apiResponses: any[]) => {
  return apiResponses.map((response) => {
    const jsonData = typeof response.json === "string" 
      ? JSON.parse(response.json) 
      : response.json;

    const metadataFields = [
      "table_name", "project_module_id", "source_module_id", "project_id",
      "survey_id", "post_data", "cohorts", "province", "district", "sector",
      "cell", "village", "izucode", "family", "province_name", "district_name",
      "sector_name", "cell_name", "village_name", "izu_name", "familyID",
      "hh_head_fullname", "enrollment_date"
    ];

    const answersData: Record<string, any> = {};
    Object.keys(jsonData).forEach((key) => {
      if (!metadataFields.includes(key)) {
        answersData[key] = jsonData[key];
      }
    });

    const formData = {
      time_spent_filling_the_form: null,
      user_id: response.user_id || null,
      table_name: jsonData.table_name || null,
      project_module_id: jsonData.project_module_id || response.project_module_id || null,
      source_module_id: jsonData.source_module_id || response.module_id || null,
      project_id: jsonData.project_id || response.project_id || null,
      survey_id: jsonData.survey_id || response.curr_form_id || null,
      post_data: jsonData.post_data || null,
      izucode: jsonData.izucode || null,
      family: jsonData.family || response.families_id || null,
      form_status: "followup",
      cohort: jsonData.cohorts || response.cohort || null,
    };

    const locationData = {
      province: jsonData.province || response.province || null,
      district: jsonData.district || response.district || null,
      sector: jsonData.sector || response.sector || null,
      cell: jsonData.cell || response.cell || null,
      village: jsonData.village || response.village || null,
    };

    const syncData = {
      sync_status: true,
      sync_reason: "From API",
      sync_attempts: 1,
      last_sync_attempt: new Date(response.updated_at || response.created_at).toISOString(),
      submitted_at: new Date(response.recorded_on || response.created_at).toISOString(),
      sync_type: "survey_submissions",
      created_by_user_id: response.user_id || null,
    };

    // Return SQLite row format with correct column names
    return {
      _id: `remote-${response.id}`,
      id: response.id,
      answers: JSON.stringify(answersData), // ✅ Use 'answers' column
      form_data: JSON.stringify(formData),
      location: JSON.stringify(locationData),
      sync_data: JSON.stringify(syncData),
      created_by_user_id: response.user_id,
      sync_status: 1,
      sync_reason: "From API",
      sync_attempts: 1,
      sync_type: "survey_submissions",
      created_at: response.created_at,
      updated_at: response.updated_at,
      is_modified: 0,
      needs_update_sync: 0,
      last_modified_at: null,
      // Other schema columns
      table_name: jsonData.table_name || null,
      name: null,
      name_kin: null,
      slug: null,
      json2: null,
      post_data: jsonData.post_data || null,
      loads: null,
      time_spent: null,
      user_id: response.user_id,
      is_primary: 0,
      project_module_id: jsonData.project_module_id || response.project_module_id || null,
      source_module_id: jsonData.source_module_id || response.module_id || null,
      project_id: jsonData.project_id || response.project_id || null,
      survey_status: null,
      fetch_data: null,
      prev_id: null,
      order_list: null,
      survey_id: jsonData.survey_id || response.curr_form_id || null,
    };
  });
};



// ============================================================================
// UPDATE SUBMISSION LOCALLY
// ============================================================================

// Fixed version of updateSurveySubmissionLocally
export const updateSurveySubmissionLocally = async (
  getAll: any, 
  update: any,  
  submissionId: string,
  updatedData: Partial<SurveySubmission>,
  userId: number
): Promise<void> => {
  try {
    console.log(`Updating submission ${submissionId} locally...`);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      is_modified: 1,
      last_modified_at: new Date().toISOString(),
    };

    if (updatedData.data) {
      updatePayload.answers = JSON.stringify(updatedData.data);
    }

    if (updatedData.form_data) {
      updatePayload.form_data = JSON.stringify(updatedData.form_data);
    }

    if (updatedData.location) {
      updatePayload.location = JSON.stringify(updatedData.location);
    }

    const allSubmissions = await getAll("SurveySubmissions");  // ✅ Now using correct getAll
    const submission = allSubmissions.find((s: any) => s._id === submissionId);
    
    if (submission && submission.id) {
      updatePayload.needs_update_sync = 1;
      updatePayload.sync_reason = "Modified - needs sync";
    }

    await update("SurveySubmissions", submissionId, updatePayload);  // ✅ Now using correct update
    
    console.log(`Submission ${submissionId} updated locally`);
  } catch (error) {
    console.error("Error updating submission locally:", error);
    throw error;
  }
};

// ============================================================================
// UPDATE SUBMISSION ON SERVER
// ============================================================================

export const updateSurveySubmissionOnServer = async (
  submission: SurveySubmission,
  t: TFunction
): Promise<boolean> => {
  try {
    if (!submission.id) {
      throw new Error("Cannot update submission without remote ID");
    }

    const formId = submission.form_data?.survey_id || submission.form_data?.form;
    if (!formId) {
      throw new Error("No form ID found in submission");
    }

    const apiPayload = prepareApiPayload(submission, formId);
    const apiUrl = `/submissions/forms/${formId}/submissions/${submission.id}`;

    console.log(`Updating submission ${submission.id} on server...`);
    console.log("Update payload:", JSON.stringify(apiPayload, null, 2));

    const response = await baseInstance.put(apiUrl, apiPayload);

    if (response.data?.submission) {
      console.log(`Submission ${submission.id} updated on server`);
      return true;
    } else {
      throw new Error("Invalid response from server");
    }
  } catch (error: any) {
    console.error(`Failed to update submission ${submission.id}:`, error);
    console.error("Error response:", error.response?.data);
    throw error;
  }
};

// ============================================================================
// SYNC MODIFIED SUBMISSIONS
// ============================================================================

export const syncModifiedSubmissions = async (
  getAll: any,
  update: any,
  t?: TFunction,
  userId?: number
): Promise<{ synced: number; failed: number; errors: string[] }> => {
  console.log("Starting sync of modified submissions...");
  
  try {
    const isConnected = await isOnline();
    if (!isConnected) {
      console.log("Offline - skipping sync");
      if (t) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
          position: "top",
          visibilityTime: 4000,
        });
      }
      return { synced: 0, failed: 0, errors: [] };
    }

    const allSubmissions = await getAll("SurveySubmissions");
    const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
    
    let modifiedSubmissions = parsedSubmissions.filter(
      (s: SurveySubmission) => 
        s.needs_update_sync && 
        s.id && // Only sync if it has a remote ID
        (s.is_modified || s.needs_update_sync)
    );

    if (userId) {
      modifiedSubmissions = modifiedSubmissions.filter(
        (s: SurveySubmission) => String(s.created_by_user_id) === String(userId)
      );
    }
    
    console.log(`Found ${modifiedSubmissions.length} modified submissions to sync`);
    
    if (modifiedSubmissions.length === 0) {
      if (t) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: "No modified submissions to sync",
          position: "top",
          visibilityTime: 3000,
        });
      }
      return { synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const submission of modifiedSubmissions) {
      try {
        await updateSurveySubmissionOnServer(submission, t!);
        
        await update("SurveySubmissions", submission._id!, {
          sync_status: 1,
          needs_update_sync: 0,
          is_modified: 0,
          sync_reason: "Successfully updated on server",
          sync_attempts: (submission.sync_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        });
        
        synced++;
        console.log(`Synced modified submission ${submission._id}`);
      } catch (error: any) {
        failed++;
        const errorMsg = error?.response?.data?.message || error.message;
        errors.push(`${submission._id}: ${errorMsg}`);
        
        await update("SurveySubmissions", submission._id!, {
          sync_reason: `Update failed: ${errorMsg}`,
          sync_attempts: (submission.sync_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        });
        
        console.error(`Failed to sync modified submission ${submission._id}:`, error);
      }
    }

    if (t) {
      if (synced > 0 && failed === 0) {
        Toast.show({
          type: "success",
          text1: t("Alerts.success.title"),
          text2: `${synced} updates synced successfully`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (synced > 0 && failed > 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: `${synced} synced, ${failed} failed`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (failed > 0) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: `${failed} updates failed to sync`,
          position: "top",
          visibilityTime: 4000,
        });
      }
    }

    return { synced, failed, errors };
  } catch (error) {
    console.error("Error during modified submissions sync:", error);
    return { 
      synced: 0, 
      failed: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error'] 
    };
  }
};

// ============================================================================
// SYNC PENDING SUBMISSIONS (NEW SUBMISSIONS)
// ============================================================================

export const syncPendingSubmissions = async (
  getAll: any,
  update: any,
  t?: TFunction,
  userId?: number
): Promise<{ synced: number; failed: number; errors: string[] }> => {
  console.log("Starting sync of pending submissions...");
  
  try {
    const isConnected =isOnline();
    if (!isConnected) {
      console.log("Offline - skipping sync");
      if (t) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
          position: "top",
          visibilityTime: 4000,
        });
      }
      return { synced: 0, failed: 0, errors: [] };
    }

    const allSubmissions = await getAll("SurveySubmissions");
    const parsedSubmissions = allSubmissions.map(parseSQLiteRow);
    
    let pendingSubmissions = parsedSubmissions.filter(
      (s: SurveySubmission) => !s.sync_status || s.sync_status === 0
    );

    if (userId) {
      pendingSubmissions = pendingSubmissions.filter(
        (s: SurveySubmission) => String(s.created_by_user_id) === String(userId)
      );
    }
    
    console.log(`Found ${pendingSubmissions.length} pending submissions to sync`);
    
    if (pendingSubmissions.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const submission of pendingSubmissions) {
      try {
        console.log(`Syncing submission ${submission._id}...`);

        const formId = submission.form_data?.survey_id || submission.form_data?.form;
        if (!formId) {
          throw new Error("No form ID found in submission");
        }

        const apiPayload = prepareApiPayload(submission, formId);
        const apiUrl = `/submissions/${formId}/submit`;

        console.log("Syncing to:", apiUrl);
        console.log("Payload:", JSON.stringify(apiPayload, null, 2));

        const response = await baseInstance.post(apiUrl, apiPayload);
        
        if (response.data?.submission?._id) {
          await update("SurveySubmissions", submission._id!, {
            id: response.data.submission._id,
            sync_status: 1,
            sync_reason: "Successfully synced",
            sync_attempts: (submission.sync_attempts || 0) + 1,
            updated_at: new Date().toISOString(),
          });
          
          synced++;
          console.log(`✅ Synced submission ${submission._id}`);
        } else {
          throw new Error("No ID returned from API");
        }
      } catch (error: any) {
        failed++;
        const errorMsg = error?.response?.data?.message || error.message;
        errors.push(`${submission._id}: ${errorMsg}`);
        
        await update("SurveySubmissions", submission._id!, {
          sync_status: 0,
          sync_reason: `Failed: ${errorMsg}`,
          sync_attempts: (submission.sync_attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        });
        
        console.error(`Failed to sync ${submission._id}:`, error);
      }
    }

    // Show toast notification for results
    if (t) {
      if (synced > 0 && failed === 0) {
        Toast.show({
          type: "success",
          text1: t("Alerts.success.title"),
          text2: `${synced} submissions synced successfully`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (synced > 0 && failed > 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: `${synced} synced, ${failed} failed`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (failed > 0) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: `${failed} submissions failed to sync`,
          position: "top",
          visibilityTime: 4000,
        });
      }
    }

    return { synced, failed, errors };
  } catch (error) {
    console.error("Error during pending submissions sync:", error);
    return { 
      synced: 0, 
      failed: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error'] 
    };
  }
};

// ============================================================================
// COMPLETE SYNC (NEW + MODIFIED)
// ============================================================================

export const syncAllPendingChanges = async (
  getAll: any,
  update: any,
  create: any,
  t?: TFunction,
  userId?: number
): Promise<{ 
  newSynced: number; 
  newFailed: number; 
  updatesSynced: number; 
  updatesFailed: number; 
  errors: string[] 
}> => {
  console.log("Starting complete sync of all pending changes...");
  
  try {
    const isConnected = await isOnline();
    if (!isConnected) {
      console.log("Offline - skipping sync");
      if (t) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.network.title"),
          text2: t("Alerts.error.network.offline"),
          position: "top",
          visibilityTime: 4000,
        });
      }
      return { 
        newSynced: 0, 
        newFailed: 0, 
        updatesSynced: 0, 
        updatesFailed: 0, 
        errors: [] 
      };
    }

    // Sync new submissions first
    const newResults = await syncPendingSubmissions(getAll, update, t, userId);
    
    // Then sync modified submissions
    const updateResults = await syncModifiedSubmissions(getAll, update, t, userId);

    const totalSynced = newResults.synced + updateResults.synced;
    const totalFailed = newResults.failed + updateResults.failed;
    const allErrors = [...newResults.errors, ...updateResults.errors];

    if (t && (totalSynced > 0 || totalFailed > 0)) {
      if (totalSynced > 0 && totalFailed === 0) {
        Toast.show({
          type: "success",
          text1: t("Alerts.success.title"),
          text2: `${totalSynced} changes synced successfully`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (totalSynced > 0 && totalFailed > 0) {
        Toast.show({
          type: "info",
          text1: t("Alerts.info.title"),
          text2: `${totalSynced} synced, ${totalFailed} failed`,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (totalFailed > 0) {
        Toast.show({
          type: "error",
          text1: t("Alerts.error.title"),
          text2: `${totalFailed} changes failed to sync`,
          position: "top",
          visibilityTime: 4000,
        });
      }
    }

    return {
      newSynced: newResults.synced,
      newFailed: newResults.failed,
      updatesSynced: updateResults.synced,
      updatesFailed: updateResults.failed,
      errors: allErrors,
    };
  } catch (error) {
    console.error("Error during complete sync:", error);
    return { 
      newSynced: 0, 
      newFailed: 0, 
      updatesSynced: 0, 
      updatesFailed: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error'] 
    };
  }
};

// ============================================================================
// GET PENDING CHANGES COUNT
// ============================================================================

export const getPendingChangesCount = async (
  query: any,
  userId: number
): Promise<{ newSubmissions: number; modifiedSubmissions: number; total: number }> => {
  try {
    const newResult = await query(
      `SELECT COUNT(*) as count FROM SurveySubmissions 
       WHERE sync_status = 0 AND created_by_user_id = ?`,
      [userId]
    );
    
    const modifiedResult = await query(
      `SELECT COUNT(*) as count FROM SurveySubmissions 
       WHERE needs_update_sync = 1 AND id IS NOT NULL AND created_by_user_id = ?`,
      [userId]
    );
    
    const newCount = newResult[0]?.count || 0;
    const modifiedCount = modifiedResult[0]?.count || 0;
    
    return {
      newSubmissions: newCount,
      modifiedSubmissions: modifiedCount,
      total: newCount + modifiedCount,
    };
  } catch (error) {
    console.error("Error getting pending changes count:", error);
    return { newSubmissions: 0, modifiedSubmissions: 0, total: 0 };
  }
};

// ============================================================================
// CREATE SURVEY SUBMISSION
// ============================================================================

export const createSurveySubmission = (
  formData: Record<string, any>,
  fields: FormField[],
  userId: number
): SurveySubmission => {
  try {
    let answers;
    
    if (fields.length > 0) {
      answers = Object.fromEntries(
        fields
          .filter((field) => field.key !== "submit")
          .map((field) => {
            const value = formData[field.key];

            switch (field.type) {
              case "switch":
                return [field.key, value ? true : false];
              case "number":
                return [field.key, Number(value)];
              case "date":
              case "datetime":
                return [field.key, value ? new Date(value).toISOString() : null];
              default:
                return [field.key, value ?? null];
            }
          })
      );
    } else {
      answers = formData;
    }

    const localId = generateLocalId();

    return {
      _id: localId,
      id: formData.id || null,
      data: cleanObject(answers),
      form_data: cleanObject({
        time_spent_filling_the_form: formData.time_spent_filling_the_form,
        user_id: userId,
        table_name: formData.table_name,
        project_module_id: formData.project_module_id,
        source_module_id: formData.source_module_id,
        project_id: formData.project_id,
        survey_id: formData.survey_id,
        post_data: formData.post_data,
        izucode: formData.izucode,
        family: formData.family,
        form_status: "followup",
        cohorts: formData.cohort,
      }),
      location: cleanObject({
        province: formData.province,
        district: formData.district,
        sector: formData.sector,
        cell: formData.cell,
        village: formData.village,
      }),
      sync_data: cleanObject({
        sync_status: false,
        sync_reason: "New record",
        sync_attempts: 0,
        last_sync_attempt: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_by_user_id: String(userId),
        sync_type: SyncType.survey_submissions,
      }),
      created_by_user_id: String(userId),
      sync_status: 0,
      sync_reason: "Pending sync",
      sync_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_modified: false,
      needs_update_sync: false,
      form: undefined
    };
  } catch (error) {
    console.error("Error creating survey submission:", error);
    throw error;
  }
};

// ============================================================================
// SAVE SURVEY SUBMISSION TO API
// ============================================================================

const showToast = (type: string, title: string, message: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: "top",
    visibilityTime: 3000,
  });
};
const handleApiError = async (create: any, submission: any, error: any, t: TFunction) => {
  console.error("API submission failed:", error);
  const statusCode = error.response?.status;
  const isUnauthorized = statusCode === 401 || statusCode === 403;

  if (isUnauthorized) {
    showToast("error", t("Alerts.error.title"), t("Alerts.error.submission.unauthorized"));
    return;
  }

  // Save locally for retry
  await create("SurveySubmissions", toSQLiteRow(submission));
  showToast("info", t("Alerts.info.saved_locally"), t("Alerts.submitting.offline"));
  router.push("/(history)/realmDbViewer");
};
const handleOfflineSubmission = async (create: any, submission: any, t: TFunction) => {
  await create("SurveySubmissions", toSQLiteRow(submission));
  showToast("info", t("Alerts.info.offline_mode"), t("Alerts.info.will_sync"));
  router.push("/(history)/realmDbViewer");
};


const handleOnlineSubmission = async (
  create: any,
  apiUrl: string,
  submission: any,
  formData: Record<string, any>,
  t: TFunction
) => {
  showToast("info", t("Alerts.saving.survey"), t("Alerts.submitting.server"));

  const formIdMatch = apiUrl.match(/\/submissions\/([^\/]+)\/submit/);
  const formId = formIdMatch ? formIdMatch[1] : formData.survey_id;
  const apiPayload = prepareApiPayload(submission, formId);

  try {
    const response = await baseInstance.post(apiUrl, apiPayload);
    const id = response.data?.submission?._id;

    if (!id) throw new Error("No ID returned from API");

    submission.id = id;
    submission.sync_status = 1;
    submission.sync_reason = "Successfully synced";
    submission.sync_attempts = 1;
    submission.sync_data = { ...submission.sync_data, sync_status: true, sync_reason: "Successfully synced" };

    await create("SurveySubmissions", toSQLiteRow(submission));

    showToast("success", t("Alerts.success.title"), t("Alerts.success.survey"));
    router.push("/(history)/realmDbViewer");

  } catch (error: any) {
    await handleApiError(create, submission, error, t);
  }
};

const checkDuplicateSubmission = async (create: any, formData: Record<string, any>) => {
  if (!formData.source_module_id || formData.source_module_id === 22) return false;
  const allSubmissions = await create.getAll("SurveySubmissions");
  const parsedSubmissions = allSubmissions.map(parseSQLiteRow);

  return parsedSubmissions.some(submission => {
    const fd = submission.form_data;
    return (
      fd?.survey_id === formData.survey_id &&
      fd?.source_module_id === formData.source_module_id &&
      fd?.izucode === formData.izucode &&
      fd?.family === formData.family
    );
  });
};


export const saveSurveySubmissionToAPI = async (
  create: any,
  formData: Record<string, any>,
  apiUrl: string,
  t: TFunction,
  fields: FormField[] = [],
  userId: number
): Promise<void> => {
  try {
    console.log("Saving survey submission...", formData);

    const isDuplicate = await checkDuplicateSubmission(create, formData);
    if (isDuplicate) {
      showToast("error", t("Alerts.error.title"), t("Alerts.error.duplicate.survey"));
      return;
    }

    const submission = createSurveySubmission(formData, fields, userId);
    const isConnected = isOnline();

    if (isConnected) {
      await handleOnlineSubmission(create, apiUrl, submission, formData, t);
    } else {
      await handleOfflineSubmission(create, submission, t);
    }

  } catch (error: any) {
    console.error("Error in saveSurveySubmissionToAPI:", error);
    showToast("error", t("Alerts.error.title"), t("Alerts.error.submission.unexpected"));
  }
};

