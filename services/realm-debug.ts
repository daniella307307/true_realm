// RealmDebugService.ts
import { Alert, Share } from 'react-native';
import { RealmContext } from '~/providers/RealContextProvider';

const { useRealm } = RealmContext;

interface DebugOptions {
  includeAnswers?: boolean;
  includeFormData?: boolean;
  includeSyncData?: boolean;
  filterByProject?: number;
  filterByModule?: number;
  maxItems?: number;
}

export class RealmDebugService {
  private realm: any;

  constructor(realmInstance?: any) {
    this.realm = realmInstance;
  }

  /**
   * Get all submissions with detailed information
   */
  async getSubmissionDetails(options: DebugOptions = {}): Promise<any[]> {
    if (!this.realm) {
      throw new Error('Realm not initialized');
    }

    try {
      const submissions = this.realm.objects('SurveySubmission');
      const results = [];

      console.log(`Found ${submissions.length} submissions in database`);

      for (let i = 0; i < Math.min(submissions.length, options.maxItems || 50); i++) {
        const submission = submissions[i];
        const result: any = {
          id: submission.id,
          table_name: submission.form_data?.table_name,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
        };

        if (options.includeFormData && submission.form_data) {
          result.form_data = submission.form_data;
        }

        if (options.includeSyncData && submission.sync_data) {
          result.sync_data = submission.sync_data;
        }

        if (options.includeAnswers && submission.answers) {
          result.answers = submission.answers;
        }

        // Filter by project if specified
        if (options.filterByProject && submission.form_data?.project_id !== options.filterByProject) {
          continue;
        }

        // Filter by module if specified
        if (options.filterByModule && submission.form_data?.project_module_id !== options.filterByModule) {
          continue;
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error getting submission details:', error);
      throw error;
    }
  }

  /**
   * Get all families with detailed information
   */
  async getFamilyDetails(options: DebugOptions = {}): Promise<any[]> {
    if (!this.realm) {
      throw new Error('Realm not initialized');
    }

    try {
      let families;
      try {
        families = this.realm.objects('LocallyCreatedFamily');
      } catch (error) {
        console.log('LocallyCreatedFamily collection not found');
        return [];
      }

      const results = [];

      for (let i = 0; i < Math.min(families.length, options.maxItems || 50); i++) {
        const family = families[i];
        const result: any = {
          id: family.id,
          hh_id: family.hh_id,
          hh_head_fullname: family.hh_head_fullname,
          village_name: family.village_name,
          created_at: family.created_at,
          updated_at: family.updated_at,
        };

        if (options.includeFormData && family.form_data) {
          result.form_data = family.form_data;
        }

        if (options.includeSyncData && family.sync_data) {
          result.sync_data = family.sync_data;
        }

        if (family.meta) {
          result.meta = family.meta;
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error getting family details:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    if (!this.realm) {
      throw new Error('Realm not initialized');
    }

    const stats: any = {
      database_info: {
        path: this.realm.path,
        schema_version: this.realm.schemaVersion,
        is_in_transaction: this.realm.isInTransaction,
        is_closed: this.realm.isClosed,
      },
      collections: {}
    };

    try {
      // Get all object schema names
      const objectSchemas = this.realm.schema;
      
      for (const schema of objectSchemas) {
        try {
          const collection = this.realm.objects(schema.name);
          stats.collections[schema.name] = {
            count: collection.length,
            properties: Object.keys(schema.properties || {}),
          };

          // Sample first item if exists
          if (collection.length > 0) {
            const firstItem = collection[0];
            stats.collections[schema.name].sample = {};
            
            for (const prop of Object.keys(schema.properties || {})) {
              if (firstItem[prop] !== undefined) {
                const value = firstItem[prop];
                stats.collections[schema.name].sample[prop] = 
                  typeof value === 'string' && value.length > 100 
                    ? `${value.substring(0, 100)}...` 
                    : typeof value === 'object' 
                      ? '[Object]'
                      : value;
              }
            }
          }
        } catch (collectionError) {
          stats.collections[schema.name] = {
            error: collectionError.message,
            count: 0,
          };
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Export data to share/debug
   */
  async exportDataForDebugging(options: DebugOptions = {}) {
    try {
      const [submissions, families, stats] = await Promise.all([
        this.getSubmissionDetails({ ...options, maxItems: 10 }),
        this.getFamilyDetails({ ...options, maxItems: 10 }),
        this.getDatabaseStats(),
      ]);

      const debugData = {
        timestamp: new Date().toISOString(),
        database_stats: stats,
        sample_submissions: submissions,
        sample_families: families,
        options_used: options,
      };

      const debugJson = JSON.stringify(debugData, null, 2);
      
      // Share the debug data
      await Share.share({
        message: debugJson,
        title: 'Realm Database Debug Data',
      });

      return debugData;
    } catch (error) {
      console.error('Error exporting debug data:', error);
      Alert.alert('Error', `Failed to export debug data: ${error.message}`);
    }
  }

  /**
   * Quick debug alert for submissions
   */
  async showSubmissionDebug(submissionId?: number) {
    try {
      const submissions = await this.getSubmissionDetails({
        includeAnswers: true,
        includeFormData: true,
        includeSyncData: true,
        maxItems: submissionId ? 1000 : 5,
      });

      let targetSubmission = submissions[0];
      if (submissionId) {
        targetSubmission = submissions.find(s => s.id === submissionId) || submissions[0];
      }

      if (!targetSubmission) {
        Alert.alert('Debug Info', 'No submissions found in database');
        return;
      }

      const debugInfo = `
Submission Debug Info:
ID: ${targetSubmission.id}
Form Data Keys: ${targetSubmission.form_data ? Object.keys(targetSubmission.form_data).join(', ') : 'None'}
Answers Keys: ${targetSubmission.answers ? Object.keys(targetSubmission.answers).join(', ') : 'None'}
Sync Status: ${targetSubmission.sync_data?.status || 'Unknown'}
Project ID: ${targetSubmission.form_data?.project_id || 'N/A'}
Module ID: ${targetSubmission.form_data?.project_module_id || 'N/A'}
Family: ${targetSubmission.form_data?.family || 'N/A'}
Table: ${targetSubmission.form_data?.table_name || 'N/A'}

Total Submissions in DB: ${submissions.length}
      `.trim();

      Alert.alert('Submission Debug', debugInfo);
    } catch (error) {
      Alert.alert('Debug Error', `Failed to get debug info: ${error.message}`);
    }
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency(): Promise<any> {
    try {
      const submissions = await this.getSubmissionDetails({
        includeFormData: true,
        includeSyncData: true,
        maxItems: 1000,
      });

      const families = await this.getFamilyDetails({
        includeFormData: true,
        includeSyncData: true,
        maxItems: 1000,
      });

      const validation = {
        submissions: {
          total: submissions.length,
          with_form_data: submissions.filter(s => s.form_data && Object.keys(s.form_data).length > 0).length,
          with_sync_data: submissions.filter(s => s.sync_data && Object.keys(s.sync_data).length > 0).length,
          with_answers: submissions.filter(s => s.answers && Object.keys(s.answers).length > 0).length,
          pending_sync: submissions.filter(s => s.sync_data?.status === 'pending').length,
        },
        families: {
          total: families.length,
          with_form_data: families.filter(f => f.form_data && Object.keys(f.form_data).length > 0).length,
          with_sync_data: families.filter(f => f.sync_data && Object.keys(f.sync_data).length > 0).length,
          with_meta: families.filter(f => f.meta && Object.keys(f.meta).length > 0).length,
        },
        issues: [] as string[],
      };

      // Check for common issues
      if (validation.submissions.total === 0) {
        validation.issues.push('No submissions found in database');
      }

      if (validation.submissions.with_form_data < validation.submissions.total) {
        validation.issues.push(`${validation.submissions.total - validation.submissions.with_form_data} submissions missing form_data`);
      }

      if (validation.submissions.with_answers < validation.submissions.total) {
        validation.issues.push(`${validation.submissions.total - validation.submissions.with_answers} submissions missing answers`);
      }

      return validation;
    } catch (error) {
      console.error('Error validating data consistency:', error);
      throw error;
    }
  }

  /**
   * Test database connectivity
   */
  async testDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.realm) {
        console.log('Realm instance is null');
        return false;
      }

      if (this.realm.isClosed) {
        console.log('Realm is closed');
        return false;
      }

      // Try to query a collection
      const submissions = this.realm.objects('SurveySubmission');
      console.log(`Database test successful. Found ${submissions.length} submissions`);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Hook to use in your components
export const useRealmDebug = () => {
  const realm = useRealm();
  const debugService = new RealmDebugService(realm);

  const showQuickDebug = async () => {
    await debugService.showSubmissionDebug();
  };

  const exportDebugData = async () => {
    await debugService.exportDataForDebugging({
      includeAnswers: true,
      includeFormData: true,
      includeSyncData: true,
      maxItems: 20,
    });
  };

  const validateData = async () => {
    try {
      const validation = await debugService.validateDataConsistency();
      Alert.alert('Data Validation', JSON.stringify(validation, null, 2));
    } catch (error) {
      Alert.alert('Validation Error', error.message);
    }
  };

  const testConnection = async () => {
    try {
      const isConnected = await debugService.testDatabaseConnection();
      Alert.alert(
        'Connection Test', 
        isConnected ? 'Database connection successful!' : 'Database connection failed!'
      );
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    }
  };

  return {
    showQuickDebug,
    exportDebugData,
    validateData,
    testConnection,
  };
}