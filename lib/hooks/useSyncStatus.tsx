import { useState, useEffect } from "react";
import { queryClient } from "~/providers/QueryProvider";

interface Service {
  key: string;
  name: string;
}

interface Status {
  status: string;
  error: any;
}

interface Statuses {
  [key: string]: Status;
}

export const useRefetchStatuses = (services: Service[]) => {

  const [statuses, setStatuses] = useState<Statuses>({});

  console.log('The qyery: ',queryClient);
  const fetchStatuses = () => {
    const newStatuses: Statuses = {};
    services.forEach((service: any) => {
      const query = queryClient.getQueryState(service.key);
      newStatuses[service.name] = {
        status: query?.status || "idle",
        error: query?.error || null,
      };
    });
    setStatuses(newStatuses);
  };

  const retryRefetch = (key: string): void => {
    queryClient.invalidateQueries({ queryKey: [key] });
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 3000);
    return () => clearInterval(interval);
  }, [queryClient, JSON.stringify(services)]);
  

  return { statuses, retryRefetch };
};
