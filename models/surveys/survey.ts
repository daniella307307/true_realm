export const CREATE_SURVEY_TABLE = `
       CREATE TABLE IF NOT EXISTS Surveys (
       _id TEXT PRIMARY KEY,                 
       id INTEGER NOT NULL,                  
       parent_id INTEGER,                    
       name TEXT NOT NULL,                   
       name_kin TEXT,                        
       slug TEXT,                            
       json2 TEXT NOT NULL,                  
       json2_bkp TEXT,                       
       survey_status INTEGER NOT NULL,       
       module_id INTEGER,                    
       is_primary INTEGER NOT NULL,         
       table_name TEXT,                      
       post_data TEXT,                       
       fetch_data TEXT,                      
       loads TEXT,                           
       prev_id TEXT,                         
       created_at TEXT,                      
       updated_at TEXT,                      
       order_list INTEGER NOT NULL,          
       project_module_id INTEGER NOT NULL,   
       project_id INTEGER,                   
       source_module_id INTEGER             );`

 