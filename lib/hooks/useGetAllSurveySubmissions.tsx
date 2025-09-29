import { useEffect, useState } from "react";
import { RealmContext } from "~/providers/RealContextProvider";
import { SurveySubmission } from "~/models/surveys/survey-submission";

const { useRealm } = RealmContext;

export const useGetAllSurveySubmissions = () => {
  const realm = useRealm();
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const realmSubmissions = realm.objects(SurveySubmission);
      setSubmissions([...realmSubmissions]); // convert to array
      setIsLoading(false);

      // Optional: listen to changes in Realm
      const listener = () => setSubmissions([...realm.objects(SurveySubmission)]);
      realmSubmissions.addListener(listener);

      return () => {
        realmSubmissions.removeListener(listener);
      };
    } catch (error) {
      console.error("Error loading local submissions:", error);
      setIsLoading(false);
    }
  }, [realm]);

  return { submissions, isLoading };
};
