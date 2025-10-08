export const CREATE_MONITORING_MODULES_TABLE = `
  CREATE TABLE IF NOT EXISTS MonitoringModules (
    _id INTEGER,
    id INTEGER, 
    monitoring_id INTEGER,
    form_data TEXT,     
    createdAt TEXT, 
    updatedAt TEXT  
  );
`;