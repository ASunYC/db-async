import sqlite3 from 'sqlite3';

export class DatabaseMemory {
    private db: sqlite3.Database | null = null;

    private constructor() { }

    public static open(databaseName: string = ':memory:'): Promise<DatabaseMemory> {
        return new Promise((resolve, reject) => {
            const dbManager = new DatabaseMemory();
            dbManager.db = new sqlite3.Database(databaseName, (err) => {
                if (err) {
                    console.error(`Failed to connect to the database ${databaseName}:`, err);
                    reject(err);
                } else {
                    console.log(`Connected to the database ${databaseName}.`);
                    resolve(dbManager);
                }
            });
        });
    }

    public static createSharedMemoryDatabase(databaseName: string): Promise<DatabaseMemory> {
        return DatabaseMemory.open(`file:${databaseName}?mode=memory&cache=shared`);
    }

    public createTable(tableName: string, columns: string[]): void {
        if (this.db) {
            const columnsString = columns.join(', ');
            const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsString})`;

            this.db.run(query, (err) => {
                if (err) {
                    console.error('Failed to create table:', err);
                } else {
                    console.log(`Table ${tableName} created successfully.`);
                }
            });
        } else {
            console.error('Database is not open.');
        }
    }

    public insert(tableName: string, columns: string[], values: any[]): void {
        if (this.db) {
            const placeholders = columns.map(() => '?').join(', ');
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            this.db.run(query, values, (err) => {
                if (err) {
                    console.error('Failed to insert data:', err);
                } else {
                    console.log(`Data inserted into ${tableName} successfully.`);
                }
            });
        } else {
            console.error('Database is not open.');
        }
    }

    public query(query: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.all(query, params, (err, rows) => {
                    if (err) {
                        console.error('Failed to query data:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            } else {
                console.error('Database is not open.');
                reject(new Error('Database is not open.'));
            }
        });
    }

    public update(tableName: string, setClause: string, whereClause: string, params: any[]): void {
        if (this.db) {
            const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

            this.db.run(query, params, (err) => {
                if (err) {
                    console.error('Failed to update data:', err);
                } else {
                    console.log(`Data in ${tableName} updated successfully.`);
                }
            });
        } else {
            console.error('Database is not open.');
        }
    }

    public delete(tableName: string, whereClause: string, params: any[]): void {
        if (this.db) {
            const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;

            this.db.run(query, params, (err) => {
                if (err) {
                    console.error('Failed to delete data:', err);
                } else {
                    console.log(`Data from ${tableName} deleted successfully.`);
                }
            });
        } else {
            console.error('Database is not open.');
        }
    }

    public close(): void {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Failed to close the database:', err);
                } else {
                    console.log('Database connection closed.');
                }
            });
            this.db = null;
        } else {
            console.error('Database is not open.');
        }
    }
}