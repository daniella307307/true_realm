


//----------------------SQLITE DATABASE--------------------------
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true)

export interface SurveySubmission{
  id
  answers: { [key: string]: string | number | boolean | null };
  form_data: { [key: string]: string | number | boolean | null };
  location: { [key: string]: string | number | boolean | null };
  sync_data: { [key: string]: string | number | boolean | null | Date };
}


class Database{
  private db:SQLite.SQLiteDatabase | null = null;
  async init():Promise<void>{
    try{
      this.db= await SQLite.openDatabase({
        name:'survey_db.db',
        location:'default',
      });
      await this.createTables();
      console.log('Database initialized successfully');
    }catch(error){
      console.error('Error initializing database', error);
      throw error;
    }
  }
   private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS SurveySubmissions (
        _id TEXT PRIMARY KEY,
        answers TEXT NOT NULL,
        form_data TEXT NOT NULL,
        location TEXT NOT NULL,
        sync_data TEXT NOT NULL
      );
    `;

    await this.db.executeSql(query);
  }

  // Helper method to get user ID from submission
  getUserId(submission: SurveySubmission): number | null {
    if (submission.form_data && submission.form_data.user_id !== undefined) {
      return typeof submission.form_data.user_id === 'string'
        ? parseInt(submission.form_data.user_id, 10)
        : (submission.form_data.user_id as number);
    }
    return null;
  }

  // CREATE
  async createSubmission(submission: Omit<SurveySubmission, 'id'> & { id?: number }): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const id = submission.id || Date.now();
    const query = `
      INSERT OR REPLACE INTO SurveySubmissions (id, answers, form_data, location, sync_data)
      VALUES (?, ?, ?, ?, ?);
    `;

    const params = [
      id,
      JSON.stringify(submission.answers),
      JSON.stringify(submission.form_data),
      JSON.stringify(submission.location),
      JSON.stringify(submission.sync_data),
    ];

    await this.db.executeSql(query, params);
    return id;
  }

  // READ - Get by ID
  async getSubmissionById(id: number): Promise<SurveySubmission | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM SurveySubmissions WHERE id = ?;';
    const [result] = await this.db.executeSql(query, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows.item(0);
    return this.parseSubmission(row);
  }

  // READ - Get all submissions
  async getAllSubmissions(): Promise<SurveySubmission[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM SurveySubmissions ORDER BY id DESC;';
    const [result] = await this.db.executeSql(query);

    const submissions: SurveySubmission[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      submissions.push(this.parseSubmission(result.rows.item(i)));
    }

    return submissions;
  }

  // READ - Get by user ID
  async getSubmissionsByUserId(userId: number): Promise<SurveySubmission[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM SurveySubmissions;';
    const [result] = await this.db.executeSql(query);

    const submissions: SurveySubmission[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const submission = this.parseSubmission(result.rows.item(i));
      if (this.getUserId(submission) === userId) {
        submissions.push(submission);
      }
    }

    return submissions;
  }

  // UPDATE
  async updateSubmission(id: number, updates: Partial<Omit<SurveySubmission, 'id'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getSubmissionById(id);
    if (!existing) throw new Error('Submission not found');

    const updated = { ...existing, ...updates };
    await this.createSubmission({ ...updated, id });
  }

  // DELETE
  async deleteSubmission(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM SurveySubmissions WHERE id = ?;';
    await this.db.executeSql(query, [id]);
  }

  // DELETE ALL
  async deleteAllSubmissions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM SurveySubmissions;';
    await this.db.executeSql(query);
  }

  // Helper to parse database row to SurveySubmission object
  private parseSubmission(row: any): SurveySubmission {
    return {
      id: row.id,
      answers: JSON.parse(row.answers),
      form_data: JSON.parse(row.form_data),
      location: JSON.parse(row.location),
      sync_data: JSON.parse(row.sync_data),
    };
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('Database closed');
    }
  }
}

    

export const database = new Database();
export const CREATE_SURVEY_SUBMISSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS SurveySubmissions (
    _id TEXT PRIMARY KEY,
    answers TEXT NOT NULL,
    form_data TEXT NOT NULL,
    location TEXT NOT NULL,
    sync_data TEXT NOT NULL,
    created_by_user_id INTEGER,
    sync_status BOOLEAN,
    sync_reason TEXT,
    sync_attempts INTEGER,
    sync_type TEXT,
    created_at TEXT,
    updated_at TEXT
    created_by_user_id INTEGER
  );
`;
