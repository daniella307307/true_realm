import { RealmContext } from '~/providers/RealContextProvider';
import { useNetworkStore } from './network';
import { SurveySubmission } from '~/models/surveys/survey-submission';
const { useRealm, useQuery } = RealmContext;

export const initializeSyncService = () => {
    const unsubscribe = useNetworkStore.subscribe((state) => {
        const isConnected = state.isConnected;
        if (isConnected) {
            syncPendingSubmissions();
        }
    });

    return unsubscribe;
};

export const syncPendingSubmissions = async () => {
    const realm = useRealm();
    const pendingSubmissions = realm.objects(SurveySubmission).filtered('syncStatus == "pending"');
    
    for (const submission of pendingSubmissions) {
        try {
            // TODO: Implement your remote API call here
            // This is where you would make the actual HTTP request to your backend
            console.log('Syncing submission with remote server:', submission);
            
            // After successful sync, update the local record
            realm.write(() => {
                submission.sync_status = true;
                submission.syncStatus = 'synced';
                submission.lastSyncAttempt = new Date();
            });
        } catch (error) {
            console.error('Error syncing submission:', error);
            realm.write(() => {
                submission.sync_status = false;
                submission.syncStatus = 'failed';
                submission.lastSyncAttempt = new Date();
            });
        }
    }
}; 