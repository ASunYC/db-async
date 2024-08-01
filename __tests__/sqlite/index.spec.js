const sqlite = require('sqlite3');
const { Database } = require('../../src/sqlite/index.ts');

// Mock the sqlite3 module
jest.mock('sqlite3');

const mockedDatabaseInstance = {
    close: jest.fn().mockImplementation((callback) => callback(null)),
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    each: jest.fn(),
    exec: jest.fn(),
    prepare: jest.fn(),
};

describe('Database', () => {
    beforeEach(() => {
        sqlite.Database.mockImplementation((filename, mode, callback) => {
            process.nextTick(() => callback(null));
            return mockedDatabaseInstance;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should open a database', async () => {
        const db = await Database.open('test.db');
        expect(db).toBeInstanceOf(Database);
        expect(sqlite.Database).toHaveBeenCalledWith('test.db', Database.OPEN_READWRITE | Database.OPEN_CREATE, expect.any(Function));
    });

    test('should close a database', async () => {
        const db = await Database.open('test.db');
        await db.close();
        expect(mockedDatabaseInstance.close).toHaveBeenCalled();
    }, 10000); // increase timeout to 10 seconds

    test('should throw error if trying to open an already open database', async () => {
        const db = await Database.open('test.db');
        await expect(db.open('test.db')).rejects.toThrow('Database.open: database is already open');
    });

    test('should throw error if trying to close an already closed database', async () => {
        const db = await Database.open('test.db');
        await db.close();
        await expect(db.close()).rejects.toThrow('Database.close: database is not open');
    }, 10000); // increase timeout to 10 seconds
});