/**
 * This module provides a promise interface to the sqlite3 database module.
 */

import sqlite from 'sqlite3';

//-----------------------------------------------------------------------------
// The Database class
//-----------------------------------------------------------------------------

export class Database {
    private db: sqlite.Database | null = null;
    private filename?: string;

    static get OPEN_READONLY() { return sqlite.OPEN_READONLY; }
    static get OPEN_READWRITE() { return sqlite.OPEN_READWRITE; }
    static get OPEN_CREATE() { return sqlite.OPEN_CREATE; }

    /**
     * 打开数据库文件并返回数据库对象。
     *
     * @param filename 数据库文件名。
     * @param mode 打开模式，可选，默认为只读模式。
     * @returns 返回数据库对象的 Promise。
     */
    static open(filename: string, mode?: number): Promise<Database> {
        let db = new Database();
        return db.open(filename, mode);
    }

    /**
     * 打开数据库文件
     *
     * @param filename 数据库文件名
     * @param mode 打开模式，可选参数。默认为 Database.OPEN_READWRITE | Database.OPEN_CREATE
     * @returns 返回一个 Promise 对象，成功时解析为 Database 实例
     * @throws 当 mode 参数不为数字时，抛出 TypeError 异常
     * @throws 当数据库已打开时，抛出 Error 异常
     */
    open(filename: string, mode?: number): Promise<Database> {
        if (typeof mode === 'undefined') {
            mode = Database.OPEN_READWRITE | Database.OPEN_CREATE;
        } else if (typeof mode !== 'number') {
            return Promise.reject(new TypeError('Database.open: mode is not a number'));
        }

        return new Promise((resolve, reject) => {
            if (this.db) {
                return reject(new Error('Database.open: database is already open'));
            }
            let db = new sqlite.Database(filename, mode, err => {
                if (err) {
                    reject(err);
                } else {
                    this.db = db;
                    this.filename = filename;
                    resolve(this);
                }
            });
        });
    }

    /**
     * 关闭数据库连接
     *
     * @param fn 传入一个函数，该函数接收一个Database对象，并返回一个Promise对象。
     *             如果传入fn，则执行fn函数，并在fn函数执行完成后关闭数据库连接。
     *             如果fn函数执行过程中发生错误，会关闭数据库连接，并将错误抛出。
     *             如果未传入fn，则直接关闭数据库连接。
     * @returns 返回一个Promise对象，如果传入了fn，则Promise解析值为fn函数返回的Promise的解析值；
     *          否则Promise解析值为当前Database对象。
     *          如果在关闭数据库连接的过程中发生错误，Promise会被拒绝，并抛出错误。
     */
    close<T>(fn?: (db: Database) => Promise<T>): Promise<Database | T> {
        if (!this.db) {
            return Promise.reject(new Error('Database.close: database is not open'));
        }
        if (fn) {
            return fn(this).then(result => {
                return this.close().then(() => result);
            }).catch(err => {
                return this.close().then(() => Promise.reject(err));
            });
        }
        return new Promise((resolve, reject) => {
            this.db!.close(err => {
                if (err) {
                    reject(err);
                } else {
                    this.db = null;
                    resolve(this);
                }
            });
        });
    }

    /**
     * 执行SQL语句并返回结果
     *
     * @param sql SQL语句
     * @param params SQL语句中的参数列表
     * @returns 返回包含最后插入行的ID和更改的行数的Promise对象
     * @throws 当数据库未打开时，会抛出错误
     */
    run(...args: [sql: string, ...params: any[]]): Promise<{ lastID: number, changes: number }> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.run: database is not open'));
            }
            const callback = function (this: sqlite.Statement & { lastID: number, changes: number }, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            };
            args.push(callback);
            (this.db.run as (...args: any[]) => void).apply(this.db, args);
        });
    }

    /**
     * 执行SQL查询，返回查询结果的第一行数据
     *
     * @param sql SQL查询语句
     * @param params SQL查询语句中的参数列表
     * @returns 返回查询结果的第一行数据
     * @throws 当数据库未打开时，会抛出错误
     */
    get(...args: [sql: string, ...params: any[]]): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.get: database is not open'));
            }
            let callback = (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            };
            args.push(callback);
            this.db.get.apply(this.db, args);
        });
    }

    /**
     * 执行SQL查询语句，返回所有结果
     *
     * @param sql SQL查询语句
     * @param params 查询参数列表
     * @returns 返回一个Promise对象，解析为查询结果数组
     * @throws 当数据库未打开时，会抛出异常"Database.all: database is not open"
     */
    all(...args: [sql: string, ...params: any[]]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.all: database is not open'));
            }
            let callback = (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            };
            args.push(callback);
            this.db.all.apply(this.db, args);
        });
    }

    /**
     * 对数据库中的记录进行迭代操作，返回受影响的行数
     *
     * @param sql SQL查询语句
     * @param params SQL查询语句中的参数列表
     * @returns 返回Promise对象，resolve参数为受影响的行数，reject参数为错误信息
     * @throws 当参数列表为空或最后一个参数不是函数时，抛出TypeError异常
     * @throws 当数据库未打开时，抛出Error异常
     */
    each(...args: [sql: string, ...params: any[]]): Promise<number> {
        if (args.length === 0 || typeof args[args.length - 1] !== 'function') {
            throw new TypeError('Database.each: last arg is not a function');
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.each: database is not open'));
            }
            let callback = (err: Error | null, nrows: number) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(nrows);
                }
            };
            args.push(callback);
            this.db.each.apply(this.db, args);
        });
    }

    /**
     * 通用查询方法
     *
     * @param options 查询选项
     * @param table 表名
     * @param keys 查询字段列表
     * @returns 返回查询结果
     */
    async query(options: QueryOptions, table: string, keys: string[]) {
        return this.queryWithSelect(options, table, keys, "*");
    }

    /**
     * 使用SELECT语句查询数据库
     *
     * @param options 查询选项
     * @param table 查询的表名
     * @param keys 查询的关键字数组
     * @param select 需要查询的字段
     * @returns 返回查询结果
     * @throws 当数据库未连接时，返回错误提示
     */
    async queryWithSelect(
        options: QueryOptions,
        table: string,
        keys: string[],
        select: string
    ): Promise<QueryResult> {
        if (!this.db) {
            return Promise.reject(new Error("database not connected"));
        }

        options = options || {};

        let sql = `SELECT ${select} FROM ${table}`;

        // Build condition based on keys and options.key
        let condition: string | undefined;
        if (options.key && keys.length > 0) {
            const cons = keys.map(k => `${k} LIKE "%${options.key}%"`);
            condition = `(${cons.join(" OR ")})`;
        }

        if (condition) {
            sql += ` WHERE ${condition}`;
        }

        // Add additional condition if provided
        if (options.condition) {
            sql += condition ? ` AND ${options.condition}` : ` WHERE ${options.condition}`;
        }

        // Pagination
        const ret: QueryResult = { rows: [] };
        if (options.page) {
            const page = parseInt(options.page, 10);
            const pagecap = parseInt(options.pagecap || "10", 10);
            const offset = (page - 1) * pagecap;

            sql += ` LIMIT ${pagecap} OFFSET ${offset}`;

            // Calculate total count
            let sqlcount = `SELECT COUNT(*) AS count FROM ${table}`;
            if (condition) {
                sqlcount += ` WHERE ${condition}`;
            } else {
                sqlcount += ` WHERE tile_data IS NOT NULL`;
            }

            const countResult = await this.get(sqlcount);
            ret.allcount = countResult.count; // Initialize allcount here
            ret.page = page;
            ret.pagecap = pagecap;
            ret.pagecount = Math.ceil((ret.allcount || 0) / pagecap); // Use default value if allcount is undefined
        }

        ret.rows = await this.all(sql);
        return ret;
    }

    /**
     * 从指定表中删除指定id的数据
     *
     * @param id 要删除的id，多个id用逗号分隔
     * @param table 要操作的表名
     * @returns 返回Promise，无返回值
     * @throws 当数据库未连接时，会抛出错误
     */
    async delete(id: string, table: string): Promise<void> {
        if (!this.db) {
            return Promise.reject(new Error("database not connected"));
        }
        const ids = id.split(",");
        const idstr = ids.map(d => `"${d}"`).join(",");

        const sql = `DELETE FROM ${table} WHERE _id IN (${idstr})`;

        return new Promise((resolve, reject) => {
            this.db?.exec(sql, (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 执行SQL语句
     *
     * @param sql SQL语句
     * @returns 返回Promise对象，解析为当前数据库对象
     * @throws 如果数据库未打开，则抛出异常"Database.exec: database is not open"
     */
    exec(sql: string): Promise<Database> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.exec: database is not open'));
            }
            this.db.exec(sql, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    /**
     * 开启事务，并执行提供的数据库操作函数，在成功或出错后结束事务
     *
     * @param fn 执行数据库操作的函数，接收一个Database类型的参数，返回一个Promise<T>类型的值
     * @returns 返回一个Promise<T>类型的值，表示执行结果
     */
    transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
        return this.exec('BEGIN TRANSACTION').then(() => {
            return fn(this).then(result => {
                return this.exec('END TRANSACTION').then(() => result);
            }).catch(err => {
                return this.exec('ROLLBACK TRANSACTION').then(() => Promise.reject(err));
            });
        });
    }

    /**
     * 准备 SQL 语句，并返回 Statement 对象
     *
     * @param sql SQL 语句
     * @param params SQL 语句中的参数列表
     * @returns 返回 Promise 对象，解析为 Statement 对象
     * @throws 当数据库未打开时，抛出错误 "Database.prepare: database is not open"
     */
    prepare(...args: [sql: string, ...params: any[]]): Promise<Statement> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database.prepare: database is not open'));
            }
            let statement: sqlite.Statement;
            let callback = (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(new Statement(statement));
                }
            };
            args.push(callback);
            statement = this.db.prepare.apply(this.db, args);
        });
    }
}

interface QueryOptions {
    key?: string;
    condition?: string;
    page?: string;
    pagecap?: string;
}

interface QueryResult {
    allcount?: number;
    page?: number;
    pagecap?: number;
    pagecount?: number;
    rows: any[];
}

//-----------------------------------------------------------------------------
// The Statement class
//-----------------------------------------------------------------------------

class Statement {
    private statement: sqlite.Statement;

    constructor(statement: sqlite.Statement) {
        if (!(statement instanceof sqlite.Statement)) {
            throw new TypeError(`Statement: 'statement' is not a statement instance`);
        }
        this.statement = statement;
    }

    bind(...args: any[]): Promise<this> {
        return new Promise((resolve, reject) => {
            const callback = (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            };
            args.push(callback);
            this.statement.bind.apply(this.statement, args);
        });
    }

    reset(): Promise<this> {
        return new Promise((resolve) => {
            this.statement.reset(() => {
                resolve(this);
            });
        });
    }

    finalize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.statement.finalize((err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(); // can't use it anymore
                }
            });
        });
    }

    run(...args: any[]): Promise<{ lastID: number, changes: number }> {
        return new Promise((resolve, reject) => {
            const callback = function (this: sqlite.Statement & { lastID: number, changes: number }, err: Error | null) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            };
            args.push(callback);
            this.statement.run.apply(this.statement, args);
        });
    }

    get(...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const callback = (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            };
            args.push(callback);
            this.statement.get.apply(this.statement, args);
        });
    }

    all(...args: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const callback = (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            };
            args.push(callback);
            this.statement.all.apply(this.statement, args);
        });
    }

    each(...args: any[]): Promise<number> {
        if (args.length === 0 || typeof args[args.length - 1] !== 'function') {
            throw new TypeError('Statement.each: last arg is not a function');
        }
        return new Promise((resolve, reject) => {
            const callback = (err: Error | null, nrows: number) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(nrows);
                }
            };
            args.push(callback);
            this.statement.each.apply(this.statement, args);
        });
    }
}