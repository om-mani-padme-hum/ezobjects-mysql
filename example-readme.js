const ezobjects = require(`./index`);
const fs = require(`fs`);
const mysql = require(`mysql-await`);

/** 
 * Load external MySQL configuration which uses the following JSON 
 * format:
 * {
 *   "host"          : "localhost",
 *   "user"          : "ezobjects",
 *   "password"      : "myPassword",
 *   "database"      : "ezobjects"
 * }
 */
const configMySQL = JSON.parse(fs.readFileSync(`mysql-config.json`));

/** 
 * Create a connection object for the MySQL database using our MySQL 
 * module async/await wrapper.
 */
const db = mysql.createConnection(configMySQL);

/** 
 * Configure a new EZ Object called DatabaseRecord with the required 
 * `id` property that will serve as the auto-incrementing primary index.
 */
const configDatabaseRecord = {
  className: `DatabaseRecord`,
  properties: [
    { name: `id`, type: `int` }
  ]
};

/** 
 * Create the DatabaseRecord class -- Note: This object is not linked
 * to a MySQL table directly, as it has no `tableName` property, but
 * it can be extended by EZ Objects that are linked to tables.
 */
const DatabaseRecord = ezobjects.createClass(configDatabaseRecord);

/** 
 * Configure a new EZ Object called UserAccount that extends from the 
 * DatabaseRecord object and adds several additional properties,
 * including an array of `int` property and a MySQL index.
 */
const configUserAccount = {
  tableName: `user_accounts`,
  className: `UserAccount`,
  extends: DatabaseRecord,
  extendsConfig: configDatabaseRecord,
  properties: [
    { name: `username`, type: `varchar`, length: 20 },
    { name: `firstName`, type: `varchar`, length: 20 },
    { name: `lastName`, type: `varchar`, length: 20 },
    { name: `checkingBalance`, type: `decimal`, length: 17, decimals: 2 },
    { name: `permissions`, type: `Array`, arrayOf: { type: `int` } },
    { name: `favoriteDay`, type: `date` }
  ],
  indexes: [
    { name: `username`, type: `BTREE`, columns: [ `username` ] }
  ]
};

/** Create the UserAccount class */
const UserAccount = ezobjects.createClass(configUserAccount);

/** Let's use a self-executing async wrapper so we can await results */
(async () => {
  try {
    /** 
     * Create a new UserAccount called `userAccount`, initializing with 
     * plain object passed to constructor.
     */
    const userAccount = new UserAccount({
      username: `richlowe`,
      firstName: `Rich`,
      lastName: `Lowe`,
      checkingBalance: 4.32,
      permissions: [1, 3, 5],
      favoriteDay: new Date(`01-01-2018`)
    });

    /** 
     * Test if `userAccount` is an instance of DatabaseRecord using
     * the included `instanceOf` helper function.
     */
    console.log(ezobjects.instanceOf(userAccount, `DatabaseRecord`));

    /** Create `user_accounts` table if it doesn`t already exist */
    await ezobjects.createTable(configUserAccount, db);

    /** Insert `userAccount` into the database */
    await userAccount.insert(db);
    
    /** Log `userAccount` (should have automatically incremented ID now) */
    console.log(userAccount);

    /** Capture ID of new record */
    const id = userAccount.id();
    
    /** Change the property values a bit */
    userAccount.checkingBalance(50.27);
    userAccount.firstName(`Richard`);
    userAccount.favoriteDay(new Date(`09-01-2019`));

    /** Update `userAccount` in the database */
    await userAccount.update(db);

    /** Log `userAccount` (should have `checkingBalance` of 50.27) */
    console.log(userAccount);

    /** Create another new UserAccount called `anotherUserAccount` */
    const anotherUserAccount = new UserAccount();
    
    /** 
     * Using the ID captured from the previous insert operation, load 
     * the record from database.
     */
    await anotherUserAccount.load(id, db, [`username`, `firstName`, `lastName`]);

    /** Log `anotherUserAccount` (should match last `userAccount`) */
    console.log(anotherUserAccount);

    /** Delete `anotherUserAccount` from the database */
    await anotherUserAccount.delete(db);    
  } catch ( err ) {
    /** Cleanly log any errors */
    console.log(err.message);
  } finally {
    /** Close database connection */
    await db.awaitEnd();
  }
})();
