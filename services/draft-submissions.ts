import { DraftSubmission } from '~/models/draft-submissions/draft-submissions';

const AUTOSAVE_INTERVAL = 5000;
const DEBOUNCE_DELAY = 1000;

export const generateDraftId = (formId: string, userId: string): string => {
  return `draft_${formId}_${userId}`;
};


export const saveDraft = async (
  create: any,
  update: any,
  getAll: any,
  formId: string,
  userId: string,
  formData: Record<string, any>,
  currentPage: number = 0,
  totalPages: number = 1,
  formName?: string
): Promise<void> => {
  try {
    const draftId = generateDraftId(formId, userId);
    const now = new Date().toISOString();
    const progressPercentage = totalPages > 0 
      ? Math.round(((currentPage + 1) / totalPages) * 100)
      : 0;


      if ( formData == null || Object.keys(formData).length === 0) {
        console.warn('No form data to save as draft.');
        return;
      }

      if ( formData && typeof formData !== 'object') {
        console.warn('Form data is not a valid object.');
        return;
      }

    const draft: DraftSubmission = {
      _id: draftId,
      form_id: formId,
      user_id: userId,
      draft_data: formData,
      last_saved_at: now,
      last_page: currentPage,
      progress_percentage: progressPercentage,
      metadata: {
        form_name: formName,
        total_pages: totalPages,
        started_at: now,
      },
      created_at: now,
      updated_at: now,
    };

    
    const row = {
      _id: draft._id,
      form_id: draft.form_id,
      user_id: draft.user_id,
      draft_data: JSON.stringify(draft.draft_data),
      last_saved_at: draft.last_saved_at,
      last_page: draft.last_page,
      progress_percentage: draft.progress_percentage,
      metadata: JSON.stringify(draft.metadata),
      created_at: draft.created_at,
      updated_at: draft.updated_at,
    };

    const allDrafts = await getAll('DraftSubmissions');
    const existingDraft = allDrafts.find((d: any) => d._id === draftId);

    if (existingDraft) {
      
      await update('DraftSubmissions', draftId, {
        ...row,
        created_at: existingDraft.created_at, 
      });
    } else {
      await create('DraftSubmissions', row);
    }

    console.log(`Draft saved for form ${formId} at page ${currentPage}`);
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};


export const loadDraft = async (
  getAll: any,
  formId: string,
  userId: string
): Promise<DraftSubmission | null> => {
  try {
    const draftId = generateDraftId(formId, userId);
    const allDrafts = await getAll('DraftSubmissions');
    const draft = allDrafts.find((d: any) => d._id === draftId);

    if (!draft) {
      return null;
    }

    return {
      ...draft,
      draft_data: typeof draft.draft_data === 'string' 
        ? JSON.parse(draft.draft_data) 
        : draft.draft_data,
      metadata: typeof draft.metadata === 'string'
        ? JSON.parse(draft.metadata)
        : draft.metadata,
    };
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};

export const deleteDraft = async (
  deleteFunc: any,
  formId: string,
  userId: string
): Promise<void> => {
  try {
    const draftId = generateDraftId(formId, userId);
    await deleteFunc('DraftSubmissions', draftId);
    console.log(`Draft deleted for form ${formId}`);
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
};

export const getAllUserDrafts = async (
  getAll: any,
  userId: string
): Promise<DraftSubmission[]> => {
  try {
    const allDrafts = await getAll('DraftSubmissions');
    const userDrafts = allDrafts.filter((d: any) => d.user_id === userId);

    return userDrafts.map((draft: any) => ({
      ...draft,
      draft_data: typeof draft.draft_data === 'string'
        ? JSON.parse(draft.draft_data)
        : draft.draft_data,
      metadata: typeof draft.metadata === 'string'
        ? JSON.parse(draft.metadata)
        : draft.metadata,
    }));
  } catch (error) {
    console.error('Error getting user drafts:', error);
    return [];
  }
};

export const cleanupOldDrafts = async (
  query: any,
  daysOld: number = 30
): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffString = cutoffDate.toISOString();

    const result = await query(
      `DELETE FROM DraftSubmissions WHERE updated_at < ?`,
      [cutoffString]
    );

    const deletedCount = result?.rowsAffected || 0;
    console.log(`Cleaned up ${deletedCount} old drafts`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up old drafts:', error);
    return 0;
  }
};


export const createDebouncedSave = (
  saveFunction: Function,
  delay: number = DEBOUNCE_DELAY
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      saveFunction(...args);
      timeoutId = null;
    }, delay);
  };
};