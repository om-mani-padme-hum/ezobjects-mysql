# EZ Objects - MySQL Edition - v3.0.0 Pre-release

**Warning:** This version is currently in pre-release mode, though most functionality is implemented

EZ Objects (MySQL Edition) is a Node.js module (that can also be usefully browserify'd) that aims to save 
you lots of time writing class objects that are strictly typed in JavaScript, and can be tied directly to 
MySQL database tablesby way of a mix of insert/update/load/delete class method signatures.  All you have 
to do is create simple class configurations for each of your objects and then create them using the 
createClass() function.

* [Installation](#installation)
* [Basic Example](#basic-example)
* [Basic EZ Object Method Signatures](#basic-ez-object-method-signatures)
* [MySQL EZ Object Method Signatures](#mysql-ez-object-method-signatures)
* [Module Exports](#module-exports)
* [Configuration Specifications](#configuration-specifications)
* [Contributing](#contributing)
* [License](#license)

## Installation

`npm install --save ezobjects-mysql`

## Basic Example

**Important Notes:** Your object must have a unique integer property named `id` to be able to use the MySQL 
functionality of EZ Objects.  You must also use EZ Object's MySQLConnection class for your database connection.

```javascript
const ezobjects = require(`ezobjects-mysql`);
const fs = require(`fs`);

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
const db = new ezobjects.MySQLConnection(configMySQL);

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
 * Create the DatabaseRecord object -- Note: This object is not linked
 * to a MySQL table directly, as it has no `tableName` property, but
 * it can be extended by EZ Objects that are linked to tables.
 */
ezobjects.createClass(configDatabaseRecord);

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
    { name: `permissions`, type: `Array`, arrayOf: { type: 'int' } },
    { name: `favoriteDay`, type: `date` }
  ],
  indexes: [
    { name: `username`, type: `BTREE`, columns: [ `username` ] }
  ]
};

/** Create the UserAccount object */
ezobjects.createClass(configUserAccount);

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

/** Let's use a self-executing async wrapper so we can await results */
(async () => {
  try {
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
    await anotherUserAccount.load(id, db);

    /** Log `anotherUserAccount` (should match last `userAccount`) */
    console.log(anotherUserAccount);

    /** Delete `anotherUserAccount` from the database */
    await anotherUserAccount.delete(db);
  } catch ( err ) {
    /** Cleanly log any errors */
    console.log(err.message);
  } finally {
    /** Close database connection */
    db.close();
  }
})();
```

### Expected Output

```
true
UserAccount {
  _id: 1,
  _username: 'richlowe',
  _firstName: 'Rich',
  _lastName: 'Lowe',
  _checkingBalance: 4.32,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2018-01-01T06:00:00.000Z }
UserAccount {
  _id: 1,
  _username: 'richlowe',
  _firstName: 'Richard',
  _lastName: 'Lowe',
  _checkingBalance: 50.27,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2019-09-01T05:00:00.000Z }
UserAccount {
  _id: 1,
  _username: 'richlowe',
  _firstName: 'Richard',
  _lastName: 'Lowe',
  _checkingBalance: 50.27,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2019-09-01T05:00:00.000Z }
```

## Basic EZ Object Method Signatures

These are the object method signatures even the most basic of EZ Objects will have:

### new MyObject([data])
 * **Parameter:** data - `PlainObject` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the plain object `data`.  Keys can either be equal to the name of a property, or they can be have an underscore before the name of a property, as would be the case if you were to JSON.stringify() and then JSON.parse() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### new MyObject([data])
 * **Parameter:** data - `string` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the JSON encoded string `data`.  Keys can either be equal to the name of a property, or they can be have an underscore before the name of a property, as would be the case if you were to JSON.stringify() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### MyObject.init([data])
 * **Parameter:** data - `PlainObject`
 * **Description:** Initialize this object using either defaults or any provided key/value pairs in the plain object `data`.  This is also the method used by the constructor.
 
In addition, each property you define will have a single method that is a getter and setter, and 
it will have the following signatures:

### MyObject.myProperty()
 * **Returns:** `mixed`
 * **Description:** Get the value of the property.
 
### MyObject.myProperty(value)
 * **Parameter:** value - `mixed`
 * **Throws:** `TypeError` if `value` is not of the correct javascript data type for myProperty
 * **Returns:** this
 * **Description:** Set the value of the property, throwing an error if the javascript data type does not match the configuration, this is how the strict typing is implemented.  This signature returns `this` to allow for set call chaining.

## MySQL EZ Object Method Signatures

These are the object method signatures that will additionally be provided if your configuration contains a `tableName`,
meaning it's intended to be linked to a MySQL table:

### MyObject.delete(db)
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Delete the record in database `db`, table `tableName`, that has its `id` field equal to the `id` property of this object.

### MyObject.insert(db)
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Insert this object's property values into the database `db`, table `tableName`, and store the resulting insertId in the `id` property of this object.

### MyObject.load(mysqlRow[, db])
 * **Parameter:** mysqlRow `RowDataPacket` A MySQL `RowDataPacket` returned as part of a MySQL result set
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Load any configured properties from key/value pairs in  `mysqlRow`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform methods on configured properties.

### MyObject.load(obj[, db])
 * **Parameter:** obj PlainObject
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Load any configured properties from key/value pairs in `obj`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform methods on configured properties.


### MyObject.load(id, db)
 * **Parameter:** id number The value of the `id` property of the record you wish to load
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Load the record in database `db`, table `tableName`, that has its `id` field equal to provided `id` parameter.

### MyObject.load(fieldValue, db)
 * **Parameter:** fieldValue - `mixed` - The value of the `otherSearchField` property of the record you wish to load
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Load the record in database `db`, table `tableName`, that has its `otherSearchField` field equal to provided `fieldValue` parameter.  Here, the actual field name of `otherSearchField` is provided in the object configuration, see the configuration section below.

### MyObject.load(url[, db])
 * **Parameter:** url - `string` - The URL of a back-end that provides JSON data compatible with this object's initializer
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Load any configured properties from the JSON-encoded key/value pairs obtained from `url`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform methods on configured properties.
 * **Note:** This signature is useful only when your classes are standalone browserify'd and requires you to implement a backend at `url` that will output the JSON.  This signature also requires you have jQuery loaded prior to use.

### MyObject.update(db)
 * **Parameter:** db - `MySQLConnection`
 * **Description:** Update the record in database `db`, table `tableName`, with its `id` field equal to the `id` property of this object, using this object's property values.

## Module Exports

The EZ Objects module exports two functions and a MySQL class object:

### ezobjects.createTable(objectConfig, db)
A function that creates a MySQL table corresponding to the configuration outlined in `objectConfig`, if it doesn't already exist

### ezobjects.createClass(objectConfig)
A function that creates an ES6 class corresponding to the configuration outlined in `objectConfig`, with constructor, initializer, getters, setters, and also delete, insert, load, and update if `tableName` is configured

### ezobjects.MySQLConnection(mysqlConfig)
A MySQL database connection class that wraps the [standard mysql object](https://www.npmjs.com/package/mysql) and provides it with async/await functionality and transaction helpers

## Configuration Specifications

See the following for how to configure your EZ Objects:

### A basic MySQL object configuration can have the following:

* **className** - `string` - (required) Name of the class
* **properties** - `Array` - (optional) An array of property configurations that the object (and MySQL table, if applicable) should have corresponding properties for
* **extends** - `mixed` - (optional) The object that the new object should be extended from \[required to extend object]
* **extendsConfig** - `object` - (optional) The EZ Object configuration for the object that is being extended from \[required to extend object for use with MySQL table link]
* **indexes** - `Array` - (optional) An array of MySQL index configurations that should be created in the MySQL table

### A table-linked MySQL object configuration can also have the following:

* **tableName** - `string` - (optional) Provide if object should be linked with MySQL database table
* **otherSearchField** - `string` - (optional) The name of a unique property of type `string` that you want to be able to load with as an alternative to `id`

### A basic property configuration can have the following:

* **name** - `string` - (required) Name of the property, must conform to both JavaScript and MySQL rules
* **type** - `string` - (optional) JavaScript data type that the property must be equal to -- types can be `bit`, `tinyint`, `smallint`, `mediumint`, `int`, `integer`, `bigint`, `real`, `double`, `float`, `decimal`, `numeric`, `date`, `time`, 
`timestamp`, `datetime`, `year`, `char`, `varchar`, `binary`, `varbinary`, `tinyblob`, `blob`, `mediumblob`, `longblob`, `tinytext`,
`text`, `mediumtext`, `longtext`, `enum`, `set`, `boolean`, `function`, any other valid object constructor name, or `array` where `arrayOf` is provided with information about the array element types. \[either **type** or **instanceOf** is required]
* **instanceOf** - `string` - (optional) JavaScript class constructor name, or names if separated by the pipe `|` character, that the property must be an instance of \[either **type** and/or **instanceOf** is required]
* **default** - `mixed` - (optional) Sets the default value for the property in the class object
* **allowNull** - `boolean` - (optional) Indicates the property can be null, default is that only custom object types are nullable
* **arrayOf** - `string` - (required for type `array`) A plain object containing he EZ Object `type` or `instanceOf` of the elements of the array -- types can be `bit`, `tinyint`, `smallint`, `mediumint`, `int`, `integer`, `bigint`, `real`, `double`, `float`, `decimal`, `numeric`, `date`, `time`, 
`timestamp`, `datetime`, `year`, `char`, `varchar`, `binary`, `varbinary`, `tinyblob`, `blob`, `mediumblob`, `longblob`, `tinytext`,
`text`, `mediumtext`, `longtext`, `enum`, `set`, `boolean`, `function`, or any other valid object constructor name (which can alternatively be used with `instanceOf` instead).  \[either **type** or **instanceOf** is required]
* **setTransform(x, propertyConfig)** - `function` - (optional) Function that transforms and returns the property value prior to setting.  The handler for this transform will be passed the expected value `type`, if needed.

### A MySQL property configuration can also have the following:

* **length** - `number` - (optional) MySQL data length for the property \[required for MySQL table association on some data types like VARCHAR]
* **decimals** - `number` - (optional) Number of decimals that should be provided for certain data types when SELECT'ed from the MySQL table
* **unique** - `boolean` - (optional) Indicates the property is a UNIQUE KEY in the MySQL table
* **unsigned** - `boolean` - (optional) Indicates the property should be unsigned in the MySQL table
* **zerofill** - `boolean` - (optional) Indicates the property should be zero-filled in the MySQL table
* **comment** - `string` - (optional) Indicates the property should note the provided comment in the MySQL table
* **characterSet** - `string` - (optional) Indicates the property should use the provided charset in the MySQL table
* **collate** - `string` - (optional) Indicates the property should use the provided collation in the MySQL table
* **autoIncrement** - `boolean` - (optional) Indicates the property should be auto-incremented in the MySQL table
* **saveTransform(x, propertyConfig)** - `function` - (optional) Function that transforms and returns the property value prior to saving in the database
* **loadTransform(x, propertyConfig, db)** - `function` - (optional) Function that transforms and returns the property value after loading from the database.  The handler for this transform will be passed the expected value `type`, if needed, along with the MySQL connection `db` if it was provided as the third argument of the object's `load` method. 

### A MySQL index configuration can have the following (for MySQL table association only):

* **name** - `string` - (required) Name of the index, can be arbitrary, but must be unique and not PRIMARY
* **columns** - `Array` - (required) An array of strings containing property names to be indexed
* **type** - `string` - (optional) Index type, can be BTREE or HASH, defaults to BTREE
* **keyBlockSize** - `number` - (optional) Indicates the index should use the provided key block size
* **withParser** - `string` - (optional) Indicates the index should use the provided parser
* **visible** - `boolean` - (optional) Indicates the index should be visible
* **invisible** - `boolean` - (optional) Indicates the index should be invisible

### Default intiailizations for different JavaScript types

* `bit` - `Buffer.from([])`
* `tinyint` - `0`
* `smallint` - `0`
* `mediumint` - `0`
* `int` - `0`
* `integer` - `0`
* `bigint` - `0`
* `real` - `0`
* `double` - `0`
* `float` - `0`
* `decimal` - `0`
* `numeric` - `0`
* `date` - `new Date(0)`
* `time` - `00:00:00`
* `timestamp` - ``
* `datetime` - `new Date(0)`
* `year` - `0`
* `char` - ``
* `varchar` - ``
* `binary` - `Buffer.from([])`
* `varbinary` - `Buffer.from([])`
* `tinyblob` - `Buffer.from([])`
* `blob` - `Buffer.from([])`
* `mediumblob` - `Buffer.from([])`
* `longblob` - `Buffer.from([])`
* `tinytext` - ``
* `text` - ``
* `mediumtext` - ``
* `longtext` - ``
* `enum` - ``
* `set` - `new Set()`
* `boolean` - `false`
* `function` - `function () { }`
* All `array` types - `[]`
* All other types - `null`

## Contributing

Please open an issue on the GitHub repository if you find any broken functionality or other bugs/errors.  Feature requests
will also be accepted, but are not guaranteed to be implemented.

## License

MIT Licensed
