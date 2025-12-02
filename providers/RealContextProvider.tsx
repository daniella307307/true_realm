import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as SQLite from "expo-sqlite";

// --- Tables (Make sure these use consistent lowercase names)
import { CREATE_SURVEY_TABLE } from "~/models/surveys/survey";
import { CREATE_NOTIFICATIONS_TABLE } from "~/models/notifications/notifications";
import { CREATE_FAMILIES_TABLE } from "~/models/family/families";
import { CREATE_COMMENT_TABLE } from "~/models/other/comment";
import { CREATE_FOLLOWUPS_TABLE } from "~/models/followups/follow-up";
import { CREATE_APPMETADATA_TABLE_SQL } from "~/models/metadata/appmetadata";
import { CREATE_PROJECT_TABLE } from "~/models/projects/project";
import { CREATE_COHORT_TABLE } from "~/models/cohorts/cohort";
import { CREATE_IZU_TABLE } from "~/models/izus/izu";
import { CREATE_SURVEY_SUBMISSIONS_TABLE } from "~/services/survey-submission";
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
  primaryKey?: string;
  columns?: string[];
}

const tableConfigs: Record<string, TableConfig> = {
  Families: { primaryKey: "_id" },
  MonitoringModules: { primaryKey: "_id" }, // Fixed typo
  MonitoringResponses: { primaryKey: "_id" }
};

interface SQLiteContextValue {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;

  create: <T extends BaseModel>(tableName: string, data: T) => Promise<T>;
  batchCreate: <T extends BaseModel>(tableName: string, dataArray: T[], useTransaction?: boolean) => Promise<T[]>;
  upsertMany: <T extends BaseModel>(tableName: string, dataArray: T[], uniqueKey: string, useTransaction?: boolean) => Promise<T[]>;
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
        const database = await SQLite.openDatabaseAsync("app.db");
        const tables = [
          { name: "Surveys", sql: CREATE_SURVEY_TABLE },
          // { name: "Notifications", sql: CREATE_NOTIFICATIONS_TABLE },
          { name: "Users", sql: CREATE_USERS_TABLE },
          //{ name: "Families", sql: CREATE_FAMILIES_TABLE },
          //{ name: "Comment", sql: CREATE_COMMENT_TABLE },
          //{ name: "FollowUps", sql: CREATE_FOLLOWUPS_TABLE },
          { name: "Project", sql: CREATE_PROJECT_TABLE },
          //{ name: "Cohort", sql: CREATE_COHORT_TABLE },
          { name: "Izu", sql: CREATE_IZU_TABLE },
          { name: "Cell", sql: CREATE_CELL_TABLE },
          { name: "Village", sql: CREATE_VILLAGE_TABLE },
          { name: "Sector", sql: CREATE_SECTOR_TABLE },
          { name: "District", sql: CREATE_DISTRICT_TABLE },
          { name: "Province", sql: CREATE_PROVINCE_TABLE },
          { name: "AppMetadata", sql: CREATE_APPMETADATA_TABLE_SQL },
          //{ name: "MonitoringForms", sql: CREATE_MONITORING_FORMS_TABLE },
          //{ name: "MonitoringResponses", sql: CREATE_MONITORING_RESPONSES_TABLE },
          //{ name: "MonitoringModules", sql: CREATE_MONITORING_MODULES_TABLE },
          //{ name: "Stakeholder", sql: CREATE_STAKEHOLDER_TABLE },
          //{ name: "Post", sql: CREATE_POST_TABLE },
          { name: "SurveySubmissions", sql: CREATE_SURVEY_SUBMISSIONS_TABLE },
        ];

        await database.withTransactionAsync(async () => {
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
        console.log("🎉 SQLite database initialized successfully");
      } catch (error) {
        console.error("❌ Error initializing SQLite DB:", error);
        setInitError(error as Error);
        setIsReady(false);
      }
    };

    initDatabase();
  }, []);

  const ensureDb = useCallback((): SQLite.SQLiteDatabase => {
    if (!db) {
      throw new Error("SQLite database not initialized yet. Please wait for isReady to be true.");
    }
    return db;
  }, [db]);

  const transaction = useCallback(async (callback: () => Promise<void>): Promise<void> => {
    const database = ensureDb();
    try {
      await database.withTransactionAsync(async () => {
        await callback();
      });
    } catch (error: any) {
      if (error.message?.includes("cannot rollback")) {
        console.warn("Ignoring harmless rollback warning");
      } else {
        console.error("SQLite transaction error:", error);
        throw error;
      }
    }
  }, [ensureDb]);

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

  const batchCreate = useCallback(
    async <T extends BaseModel>(
      tableName: string,
      dataArray: T[],
      useTransaction: boolean = false
    ): Promise<T[]> => {
      const database = ensureDb();
      if (dataArray.length === 0) return [];

      const result: T[] = [];
      const config = tableConfigs[tableName] || {};
      const primaryKey = config.primaryKey ?? "_id";

      const prepareInsertQuery = (data: BaseModel) => {
        const id = data[primaryKey] || generateId();
        const keys = config.columns
          ? config.columns.filter((k) => k in data)
          : Object.keys(data).filter(k => k !== primaryKey);

        const allKeys = [primaryKey, ...keys];
        const values = allKeys.map((k) => (k === primaryKey ? id : data[k]));
        const placeholders = allKeys.map(() => "?").join(", ");
        const columns = allKeys.join(", ");

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
          await transaction(runInserts);
        } else {
          await runInserts();
        }
      } catch (error) {
        console.error(`Error batch creating records in ${tableName}:`, error);
        throw error;
      }

      return result;
    },
    [ensureDb, transaction]
  );

  // NEW: upsertMany function for your forms hook
  const upsertMany = useCallback(
    async <T extends BaseModel>(
      tableName: string,
      dataArray: T[],
      uniqueKey: string = "id",
      useTransaction: boolean = true
    ): Promise<T[]> => {
      const database = ensureDb();
      if (dataArray.length === 0) return [];

      const result: T[] = [];

      const runUpserts = async () => {
        for (const data of dataArray) {
          // Check if record exists
          const existingRecord = await database.getFirstAsync<any>(
            `SELECT ${uniqueKey} FROM ${tableName} WHERE ${uniqueKey} = ?`,
            [data[uniqueKey]]
          );

          const keys = Object.keys(data);
          const values = keys.map(k => data[k]);

          if (existingRecord) {
            // UPDATE existing record
            const updateKeys = keys.filter(k => k !== uniqueKey);
            const updateValues = updateKeys.map(k => data[k]);
            const setClause = updateKeys.map(k => `${k} = ?`).join(", ");

            await database.runAsync(
              `UPDATE ${tableName} SET ${setClause} WHERE ${uniqueKey} = ?`,
              [...updateValues, data[uniqueKey]]
            );
          } else {
            // INSERT new record
            const placeholders = keys.map(() => "?").join(", ");
            const columns = keys.join(", ");

            await database.runAsync(
              `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
              values
            );
          }

          result.push(data);
        }
      };

      try {
        if (useTransaction) {
          await transaction(runUpserts);
        } else {
          await runUpserts();
        }
      } catch (error) {
        console.error(`Error upserting records in ${tableName}:`, error);
        throw error;
      }

      return result;
    },
    [ensureDb, transaction]
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

  const value: SQLiteContextValue = useMemo(() => ({
    db,
    isReady,
    create,
    batchCreate,
    upsertMany,
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
    upsertMany,
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

  if (initError) {
    console.error("SQLite initialization error:", initError);
  }

  return <SQLiteContext.Provider value={value}>{children}</SQLiteContext.Provider>;
};

export const useSQLite = () => {
  const ctx = useContext(SQLiteContext);
  if (!ctx) {
    throw new Error("useSQLite must be used within a SQLiteProvider");
  }
  return ctx;
};

export default SQLiteProvider;