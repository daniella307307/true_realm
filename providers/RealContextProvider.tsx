import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as SQLite from "expo-sqlite";

// --- Tables (Make sure these use consistent lowercase names)
import { CREATE_SURVEY_TABLE } from "~/models/surveys/survey";
import { CREATE_NOTIFICATIONS_TABLE } from "~/models/notifications/notifications";
import { CREATE_FAMILIES_TABLE } from "~/models/family/families";
import { CREATE_COMMENT_TABLE } from "~/models/other/comment";
import { CREATE_FOLLOWUPS_TABLE } from "~/models/followups/follow-up";
import { CREATE_PROJECT_TABLE } from "~/models/projects/project";
import { CREATE_COHORT_TABLE } from "~/models/cohorts/cohort";
import { CREATE_IZU_TABLE } from "~/models/izus/izu";
import { CREATE_SURVEY_SUBMISSIONS_TABLE } from "~/models/surveys/survey-submission";
import { CREATE_CELL_TABLE } from "~/models/locations/cell";
import { CREATE_VILLAGE_TABLE } from "~/models/locations/village";
import { CREATE_SECTOR_TABLE } from "~/models/locations/sector";
import { CREATE_DISTRICT_TABLE } from "~/models/locations/district";
import { CREATE_PROVINCE_TABLE } from "~/models/locations/province";
import { CREATE_MONITORING_FORMS_TABLE } from "~/models/monitoring/monitoringforms";
import { CREATE_MONITORING_RESPONSES_TABLE } from "~/models/monitoring/monitoringresponses";
import { CREATE_MONITORING_MODULES_TABLE } from "~/models/monitoring/monitoringmodule";
import { CREATE_STAKEHOLDER_TABLE } from "~/models/stakeholders/stakeholder";
import { CREATE_POST_TABLE } from "~/models/posts/post";
import { CREATE_USERS_TABLE } from "~/models/users/index";

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface BaseModel {
  _id?: string;
  [key: string]: any;
}
interface TableConfig {
  primaryKey?: string;       // Primary key column name, defaults to '_id'
  columns?: string[];        // List of allowed columns for insert/update, defaults to all keys in data object
}

const tableConfigs: Record<string, TableConfig> = {
  Families: { primaryKey: "_id" },
  MonituringModules: { primaryKey: "_id" },
  MonituringResponses: { primaryKey: "_id" }
}

interface SQLiteContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;

  create: <T extends BaseModel>(tableName: string, data: T) => Promise<T>;
  batchCreate: <T extends BaseModel>(tableName: string, dataArray: T[]) => Promise<T[]>;
  update: <T extends BaseModel>(tableName: string, id: string, data: Partial<T>) => Promise<void>;
  delete: (tableName: string, id: string) => Promise<void>;
  deleteAll: (tableName: string) => Promise<void>;

  getAll: <T extends BaseModel>(tableName: string, whereClause?: string, params?: any[]) => Promise<T[]>;
  getByQuery: <T extends BaseModel>(tableName: string, whereClause?: string, params?: any[], limit?: number) => Promise<T[]>;
  getById: <T extends BaseModel>(tableName: string, id: string) => Promise<T | null>;
  getFirst: <T extends BaseModel>(tableName: string, whereClause?: string, params?: any[]) => Promise<T | null>;
  count: (tableName: string, whereClause?: string, params?: any[]) => Promise<number>;

  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  execute: (sql: string, params?: any[]) => Promise<void>;
  transaction: (callback: () => Promise<void>) => Promise<void>;
}

const SQLiteContext = createContext<SQLiteContextValue | undefined>(undefined);

export const SQLiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log("🔄 Initializing SQLite database...");
        const database = await SQLite.openDatabaseAsync("app.db");
        console.log("✅ Database opened successfully");

        // List of all your tables and create statements
        const tables = [
          { name: "Surveys", sql: CREATE_SURVEY_TABLE },
          { name: "Notifications", sql: CREATE_NOTIFICATIONS_TABLE },
          { name: "Users", sql: CREATE_USERS_TABLE },
          { name: "Families", sql: CREATE_FAMILIES_TABLE },
          { name: "Comment", sql: CREATE_COMMENT_TABLE },
          { name: "FollowUps", sql: CREATE_FOLLOWUPS_TABLE }, // ✅ use correct name (no dash)
          { name: "Project", sql: CREATE_PROJECT_TABLE },
          { name: "Cohort", sql: CREATE_COHORT_TABLE },
          { name: "Izu", sql: CREATE_IZU_TABLE },
          { name: "Cell", sql: CREATE_CELL_TABLE },
          { name: "Village", sql: CREATE_VILLAGE_TABLE },
          { name: "Sector", sql: CREATE_SECTOR_TABLE },
          { name: "District", sql: CREATE_DISTRICT_TABLE },
          { name: "Province", sql: CREATE_PROVINCE_TABLE },
          { name: "MonitoringForms", sql: CREATE_MONITORING_FORMS_TABLE },
          { name: "MonitoringResponses", sql: CREATE_MONITORING_RESPONSES_TABLE },
          { name: "MonitoringModules", sql: CREATE_MONITORING_MODULES_TABLE },
          { name: "Stakeholder", sql: CREATE_STAKEHOLDER_TABLE },
          { name: "Post", sql: CREATE_POST_TABLE },
          { name: "SurveySubmissions", sql: CREATE_SURVEY_SUBMISSIONS_TABLE },
        ];

        // ✅ Drop and recreate all tables safely
        await database.withTransactionAsync(async () => {
          for (const table of tables) {
            try {
              await database.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
              console.log(`🗑️  Dropped table: ${table.name}`);
            } catch (error) {
              console.error(`⚠️ Error dropping table ${table.name}:`, error);
            }
          }

          for (const table of tables) {
            try {
              await database.execAsync(table.sql);
              console.log(`✅ Created table: ${table.name}`);
            } catch (error) {
              console.error(`❌ Error creating table ${table.name}:`, error);
            }
          }
        });

        setDb(database);
        setIsReady(true);
        console.log("🎉 SQLite database initialized successfully (tables recreated)");
      } catch (error) {
        console.error("❌ Error initializing SQLite DB:", error);
        setInitError(error as Error);
        setIsReady(false);
      }
    };

    initDatabase();
  }, []);




  // Guarded helper to ensure database is initialized
  const ensureDb = useCallback((): SQLite.SQLiteDatabase => {
    if (!db) {
      throw new Error("SQLite database not initialized yet. Please wait for isReady to be true.");
    }
    return db;
  }, [db]);

  // --- CRUD Operations (ALL wrapped in useCallback) ---

  const create = useCallback(async <T extends BaseModel>(tableName: string, data: T): Promise<T> => {
    const database = ensureDb();
    const id = data._id || generateId();
    const keys = Object.keys(data).filter(k => k !== "_id");
    const values = keys.map(k => data[k]);

    const placeholders = keys.map(() => "?").join(", ");
    const columns = ["_id", ...keys].join(", ");

    try {
      await database.runAsync(
        `INSERT INTO ${tableName} (${columns}) VALUES (?, ${placeholders})`,
        [id, ...values]
      );
      return { ...data, _id: id } as T;
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  type AnyRecord = { [key: string]: any };

  const batchCreate = useCallback(
  async <T extends AnyRecord>(
    tableName: string,
    dataArray: T[],
    useTransaction: boolean = false // ✅ default to false
  ): Promise<T[]> => {
    const database = ensureDb();
    if (dataArray.length === 0) return [];

    const result: T[] = [];
    const config = tableConfigs[tableName] || {};
    const primaryKey = config.primaryKey ?? "_id";

    const prepareInsertQuery = (data: AnyRecord) => {
      const id = data[primaryKey] || generateId();
      const keys = config.columns
        ? config.columns.filter((k) => k in data)
        : Object.keys(data);

      if (!keys.includes(primaryKey)) keys.unshift(primaryKey);
      const values = keys.map((k) => (k === primaryKey ? id : data[k]));
      const placeholders = keys.map(() => "?").join(", ");
      const columns = keys.join(", ");

      return {
        sql: `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        params: values,
        id,
      };
    };

    const runInserts = async () => {
      for (const data of dataArray) {
        const { sql, params, id } = prepareInsertQuery(data);
        await database.runAsync(sql, params);
        result.push({ ...data, [primaryKey]: id } as T);
      }
    };

    try {
      if (useTransaction) {
        await transaction(runInserts); // ✅ use safe wrapper
      } else {
        await runInserts();
      }
    } catch (error) {
      console.error(`Error batch creating records in ${tableName}:`, error);
      throw error;
    }

    return result;
  },
  [ensureDb]
);


  const update = useCallback(async <T extends BaseModel>(
    tableName: string,
    id: string,
    data: Partial<T>
  ): Promise<void> => {
    const database = ensureDb();
    const keys = Object.keys(data).filter(k => k !== "_id");
    const values = keys.map(k => data[k]);

    const setClause = keys.map(k => `${k} = ?`).join(", ");

    try {
      await database.runAsync(
        `UPDATE ${tableName} SET ${setClause} WHERE _id = ?`,
        [...values, id]
      );
    } catch (error) {
      console.error(`Error updating record in ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const deleteRecord = useCallback(async (tableName: string, id: string): Promise<void> => {
    const database = ensureDb();
    try {
      await database.runAsync(`DELETE FROM ${tableName} WHERE _id = ?`, [id]);
    } catch (error) {
      console.error(`Error deleting record from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const deleteAll = useCallback(async (tableName: string): Promise<void> => {
    const database = ensureDb();
    try {
      await database.runAsync(`DELETE FROM ${tableName}`);
    } catch (error) {
      console.error(`Error deleting all records from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  // --- Read Operations (ALL wrapped in useCallback) ---

  const getAll = useCallback(async <T extends BaseModel>(
    tableName: string,
    whereClause?: string,
    params?: any[]
  ): Promise<T[]> => {
    const database = ensureDb();
    try {
      const query = whereClause
        ? `SELECT * FROM ${tableName} WHERE ${whereClause}`
        : `SELECT * FROM ${tableName}`;
      return await database.getAllAsync<T>(query, params || []);
    } catch (error) {
      console.error(`Error getting all records from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const getByQuery = useCallback(async <T extends BaseModel>(
    tableName: string,
    whereClause: string = "1=1",
    params: any[] = [],
    limit?: number
  ): Promise<T[]> => {
    const database = ensureDb();
    try {
      let sql = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
      if (limit && limit > 0) sql += ` LIMIT ${limit}`;
      return await database.getAllAsync<T>(sql, params);
    } catch (error) {
      console.error(`Error querying records from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const getById = useCallback(async <T extends BaseModel>(
    tableName: string,
    id: string
  ): Promise<T | null> => {
    const database = ensureDb();
    try {
      return await database.getFirstAsync<T>(
        `SELECT * FROM ${tableName} WHERE _id = ?`,
        [id]
      );
    } catch (error) {
      console.error(`Error getting record by ID from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const getFirst = useCallback(async <T extends BaseModel>(
    tableName: string,
    whereClause?: string,
    params?: any[]
  ): Promise<T | null> => {
    const database = ensureDb();
    try {
      const query = whereClause
        ? `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`
        : `SELECT * FROM ${tableName} LIMIT 1`;
      return await database.getFirstAsync<T>(query, params || []);
    } catch (error) {
      console.error(`Error getting first record from ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  const count = useCallback(async (
    tableName: string,
    whereClause?: string,
    params?: any[]
  ): Promise<number> => {
    const database = ensureDb();
    try {
      const query = whereClause
        ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
        : `SELECT COUNT(*) as count FROM ${tableName}`;
      const result = await database.getFirstAsync<{ count: number }>(query, params || []);
      return result?.count || 0;
    } catch (error) {
      console.error(`Error counting records in ${tableName}:`, error);
      throw error;
    }
  }, [ensureDb]);

  // --- Raw Query Operations (ALL wrapped in useCallback) ---

  const query = useCallback(async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
    const database = ensureDb();
    try {
      return await database.getAllAsync<T>(sql, params || []);
    } catch (error) {
      console.error(`Error executing query:`, error);
      throw error;
    }
  }, [ensureDb]);

  const execute = useCallback(async (sql: string, params?: any[]): Promise<void> => {
    const database = ensureDb();
    try {
      await database.runAsync(sql, params || []);
    } catch (error) {
      console.error(`Error executing statement:`, error);
      throw error;
    }
  }, [ensureDb]);
  const transaction = useCallback(async (callback: () => Promise<void>): Promise<void> => {
    const database = ensureDb();
    try {
      if (!database) throw new Error("Database not initialized");

      // Wrap transaction safely
      await database.withTransactionAsync(async () => {
        try {
          await callback();
        } catch (err) {
          console.error("⚠️ Transaction callback failed:", err);
          throw err;
        }
      });
    } catch (error: any) {
      // Prevent "cannot rollback - no transaction is active" crash
      if (error.message?.includes("cannot rollback")) {
        console.warn("⚠️ Ignoring harmless rollback warning");
      } else {
        console.error("❌ SQLite transaction error:", error);
      }
    }
  }, [ensureDb]);

  // Context value - wrapped in useMemo to prevent unnecessary re-renders
  const value: SQLiteContextValue = useMemo(() => ({
    db,
    isReady,
    create,
    batchCreate,
    update,
    delete: deleteRecord,
    deleteAll,
    getAll,
    getByQuery,
    getById,
    getFirst,
    count,
    query,
    execute,
    transaction,
  }), [
    db,
    isReady,
    create,
    batchCreate,
    update,
    deleteRecord,
    deleteAll,
    getAll,
    getByQuery,
    getById,
    getFirst,
    count,
    query,
    execute,
    transaction,
  ]);

  // If there's an initialization error, you might want to handle it
  if (initError) {
    console.error("SQLite initialization error:", initError);
    // You could render an error UI here if needed
  }

  return <SQLiteContext.Provider value={value}>{children}</SQLiteContext.Provider>;
};

// CRITICAL: Export the hook as a named export
export const useSQLite = () => {
  const ctx = useContext(SQLiteContext);
  if (!ctx) {
    throw new Error("useSQLite must be used within a SQLiteProvider");
  }
  return ctx;
};

// Also export as default for flexibility
export default SQLiteProvider;