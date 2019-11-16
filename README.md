# EZ Objects - MySQL Edition - v10.0.2

EZ Objects (MySQL Edition) is a Node.js module (that can also be usefully browserify'd) that aims to save 
you lots of time writing class objects that are strictly typed in JavaScript, and can be tied directly to 
MySQL database tables by way of a mix of automatically generated [insert](#myobjectinsertdb)/[update](#myobjectupdatedb)/[load](#myobjectloadfieldvalue-db)/[delete](#myobjectdeletedb) class method signatures.  All you have 
to do is create simple class configurations for each of your objects and then create them using the exported 
[ezobjects.createClass()](#ezobjectscreateclassobjectconfig) function.

* [Installation](#installation)
* [Basic Example](#basic-example)
* [EZ Object Types](#ez-object-types)
* [Important - Required Property](#one-property-is-required)
* [Basic EZ Object Method Signatures](#basic-ez-object-method-signatures)
* [MySQL EZ Object Method Signatures](#mysql-ez-object-method-signatures)
* [Module Exports](#module-exports)
* [Configuration Specifications](#configuration-specifications)
* [Wasted Space](#wasted-space)
* [See Also](#see-also)
* [Contributing](#contributing)
* [License](#license)

### Want EZ Objects Without The MySQL?

EZ Object's capabilities has been split into multiple packages to target the needs of specific users.  This
is a branch of the original `ezobjects` module that preserves the original MySQL table-linked capability,
while the original `ezobjects` has had it removed so those who don't need the database storage can remove
the dependency.  It also worked out better that way so that `ezobjects` types can be different than MySQL
types, which might be different from another database's types, etc.  If you don't need MySQL capability,
you can find the original `ezobjects` package on [npm](https://www.npmjs.com/package/ezobjects) or [GitHub](https://github.com/om-mani-padme-hum/ezobjects.git).

## Installation

`npm i ezobjects-mysql`

## Basic Example

It might be best to start off with a basic example where I do the following:

1) Configure an EZ Object called `DatabaseRecord`
2) Configure another EZ Object called `UserAccount` that extends from `DatabaseRecord`
3) Create the classes for both using the `createClass` EZ Objects export
4) Create my *user_accounts* MySQL table using the `createTable` export (if it doesn't already exist)
5) Demonstrate the getters, setters, and delete/insert/load/update class methods that EZ Objects automatically provides.

```javascript
const ezobjects = require(`ezobjects-mysql`);
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

/** Let's use a self-executing async function so we can await results */
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
    await db.awaitEnd();
  }
})();
```

### Expected Output

```
true
UserAccount {
  _id: 1,
  _username: `richlowe`,
  _firstName: `Rich`,
  _lastName: `Lowe`,
  _checkingBalance: 4.32,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2018-01-01T06:00:00.000Z }
UserAccount {
  _id: 1,
  _username: `richlowe`,
  _firstName: `Richard`,
  _lastName: `Lowe`,
  _checkingBalance: 50.27,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2019-09-01T05:00:00.000Z }
UserAccount {
  _id: 1,
  _username: `richlowe`,
  _firstName: `Richard`,
  _lastName: `Lowe`,
  _checkingBalance: 50.27,
  _permissions: [ 1, 3, 5 ],
  _favoriteDay: 2019-09-01T05:00:00.000Z }
```

## EZ Object Types

See the table below for a list of EZ Object types along with their JavaScript type and default value, as well 
as the default MySQL type.

| EZ Object Type | JavaScript Type | Default JavaScript Value | Default MySQL Type | 
|      :---     |     :---:       |          :---:           |         :---:      |  
| **bit** | `Buffer` | `Buffer.from([])` | BIT |
| **tinyint** | `Number` | 0 | TINYINT |
| **smallint** | `Number` | 0 | SMALLINT |
| **mediumint** | `Number` | 0 | MEDIUMINT |
| **int** | `Number` | 0 | INT |
| **bigint** | `Number` | 0 | BIGINT |
| **real** | `Number` | 0 | REAL |
| **double** | `Number` | 0 | DOUBLE |
| **float** | `Number` | 0 | FLOAT |
| **decimal** | `Number` | 0 | DECIMAL |
| **numeric** | `Number` | 0 | NUMERIC |
| **time** | `String` | '00:00:00' | TIME |
| **char** | `String` | '' | CHAR |
| **varchar** | `String` | '' | VARCHAR |
| **binary** | `Buffer` | `Buffer.from([])` | BINARY |
| **varbinary** | `Buffer` | `Buffer.from([])` | VARBINARY |
| **tinyblob** | `Buffer` | `Buffer.from([])` | TINYBLOB |
| **blob** | `Buffer` | `Buffer.from([])` | BLOB |
| **mediumblob** | `Buffer` | `Buffer.from([])` | MEDIUMBLOB |
| **longblob** | `Buffer` | `Buffer.from([])` | LONGBLOB |
| **tinytext** | `String` | '' | TINYTEXT |
| **text** | `String` | '' | TEXT |
| **mediumtext** | `String` | '' | MEDIUMTEXT |
| **longtext** | `String` | '' | LONGTEXT |
| **set** | `Set` | `new Set()` | SET |
| **boolean** | `Boolean` | `false` | TINYINT |
| **function** | `function` | `function () { }` | TEXT |
| **object** | `Object` | `{}` | TEXT |
| **MyEZObject** | MyEZObject | `null` | TINYTEXT |
| **Array\[bit]** | `Array` | `[]` | TEXT |
| **Array\[tinyint]** | `Array` | `[]` | TEXT |
| **Array\[smallint]** | `Array` | `[]` | TEXT |
| **Array\[mediumint]** | `Array` | `[]` | TEXT |
| **Array\[int]** | `Array` | `[]` | TEXT |
| **Array\[bigint]** | `Array` | `[]` | TEXT |
| **Array\[real]** | `Array` | `[]` | TEXT |
| **Array\[double]** | `Array` | `[]` | TEXT |
| **Array\[float]** | `Array` | `[]` | TEXT |
| **Array\[decimal]** | `Array` | `[]` | TEXT |
| **Array\[numeric]** | `Array` | `[]` | TEXT |
| **Array\[time]** | `Array` | `[]` | TEXT |
| **Array\[char]** | `Array` | `[]` | TEXT |
| **Array\[varchar]** | `Array` | `[]` | TEXT |
| **Array\[binary]** | `Array` | `[]` | TEXT |
| **Array\[varbinary]** | `Array` | `[]` | TEXT |
| **Array\[tinyblob]** | `Array` | `[]` | TEXT |
| **Array\[blob]** | `Array` | `[]` | MEDIUMTEXT |
| **Array\[mediumblob]** | `Array` | `[]` | LONGTEXT |
| **Array\[longblob]** | `Array` | `[]` | LONGTEXT |
| **Array\[tinytext]** | `Array` | `[]` | TEXT |
| **Array\[text]** | `Array` | `[]` | MEDIUMTEXT |
| **Array\[mediumtext]** | `Array` | `[]` | LONGTEXT |
| **Array\[longtext]** | `Array` | `[]` | LONGTEXT |
| **Array\[set]** | `Array` | `[]` | TEXT |
| **Array\[boolean]** | `Array` | `[]` | TEXT |
| **Array\[function]** | `Array` | `[]` | MEDIUMTEXT |
| **Array\[object]** | `Array` | `[]` | MEDIUMTEXT |
| **Array\[MyEZObject]** | `Array` | `[]` | TEXT |

## One Property Is Required

Each of your MySQL EZ Objects **must** include an `int` property named `id` that will be automatically 
configured to serve as an auto-incrementing primary index in the MySQL table that you are linking your object to.  
The `load` method will generally be based off the `id` field, unless you specify a `otherSearchProperty` to load 
by as an alternative.  Also note that you **must** also use the [mysql-await](https://github.com/om-mani-padme-hum/mysql-await) 
module for your database connection for compatability purposes and to allow async/await functionality.  It is simply
a wrapper for the popular [mysql](https://github.com/mysqljs/mysql) module and takes no time to scan and see that nothing 
fishy is going on.

## Basic EZ Object Method Signatures

These are the object method signatures even the most basic of EZ Objects will have:

### new MyObject([data])
 * **Parameter:** data - `Object` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the plain object `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() and then JSON.parse() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### new MyObject([data])
 * **Parameter:** data - `string` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the JSON encoded string `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### MyObject.init([data])
 * **Parameter:** data - `Object`
 * **Description:** Initialize this object using either defaults or any provided key/value pairs in the plain object `data`.  This is also the method used by the constructor.
 
In addition, each property you define will have a single method that is a getter and setter, and it will have the following signatures:

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
 * **Parameter:** db - `Object`
 * **Description:** Delete the record in database `db`, table `tableName`, that has its `id` field equal to the `id` property of this object.

### MyObject.insert(db)
 * **Parameter:** db - `Object`
 * **Description:** Insert this object's property values into the database `db`, table `tableName`, and store the resulting insertId in the `id` property of this object.

### MyObject.load(mysqlRow[, db])
 * **Parameter:** mysqlRow `RowDataPacket` - A MySQL `RowDataPacket` returned as part of a MySQL result set
 * **Parameter:** db - `Object`
 * **Description:** Load any configured properties from key/value pairs in  `mysqlRow`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.

### MyObject.load(obj[, db])
 * **Parameter:** obj Object
 * **Parameter:** db - `Object`
 * **Description:** Load any configured properties from key/value pairs in `obj`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.

### MyObject.load(id, db)
 * **Parameter:** id number The value of the `id` property of the record you wish to load
 * **Parameter:** db - `Object`
 * **Description:** Load the record in database `db`, table `tableName`, that has its `id` field equal to provided `id` parameter.

### MyObject.load(fieldValue, db)
 * **Parameter:** fieldValue - `mixed` - The value of the `otherSearchProperty` property of the record you wish to load
 * **Parameter:** db - `Object`
 * **Description:** Load the record in database `db`, table `tableName`, that has its `otherSearchProperty` field equal to provided `fieldValue` parameter.  Here, the actual field name of `otherSearchProperty` is provided in the object configuration, see the configuration section below.

### MyObject.load(url[, db])
 * **Parameter:** url - `string` - The URL of a back-end that provides JSON data compatible with this object's initializer
 * **Parameter:** db - `Object`
 * **Description:** Load any configured properties from the JSON-encoded key/value pairs obtained from `url`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.
 * **Note:** This signature is useful only when your classes are standalone browserify'd and requires you to implement a backend at `url` that will output the JSON.  (This signature no longer requires jQuery to use)

### MyObject.update(db)
 * **Parameter:** db - `Object`
 * **Description:** Update the record in database `db`, table `tableName`, with its `id` field equal to the `id` property of this object, using this object's property values.

## Module Exports

The EZ Objects module exports two functions:

### ezobjects.createTable(objectConfig, db)
A function that creates a MySQL table corresponding to the configuration outlined in `objectConfig`, if it doesn't already exist

### ezobjects.createClass(objectConfig)
A function that creates an ES6 class corresponding to the configuration outlined in `objectConfig`, with constructor, initializer, getters, setters, and also delete, insert, load, and update if `tableName` is configured

In addition, each EZ Object you create will be available from the module as well, for example:

```javascript
const myObject = new ezobjects.MyObject()
```

## Configuration Specifications

See the following for how to configure your EZ Objects:

### A basic MySQL object configuration can have the following:

* **className** - `string` - (required) Name of the class
* **properties** - `Array` - (optional) An array of property configurations that the object (and MySQL table, if applicable) should have corresponding properties for
* **extends** - `mixed` - (optional) The object that the new object should be extended from \[required to extend object]
* **extendsConfig** - `object` - (optional) The EZ Object configuration for the object that is being extended from \[required to extend object]
* **indexes** - `Array` - (optional) An array of MySQL index configurations that should be created in the MySQL table

### A table-linked MySQL object configuration can also have the following:

* **tableName** - `string` - (optional) Provide if object should be linked with MySQL database table
* **otherSearchProperty** - `string` - (optional) The name of a **unique** property that you want to be able to load with as an alternative to the mandatory `id` property.  Note the `id` property is still required.
* **url** - `string` - (optional) The URL of a back-end that will provide a JSON.stringify output of the EZ Object for browserify'd loading of the object using an AJAX background request.  For now, the URL must take the ID # of the record at the very end, i.e. http://go.to/myObject/load/{ID#}

### A basic property configuration can have the following:

* **name** - `string` - (required) Name of the property, must conform to both JavaScript and MySQL rules
* **type** - `string` - (optional) EZ Object type that the property must be equal to -- types can be `bit`, `tinyint`, `smallint`, `mediumint`, `int`, `bigint`, `real`, `double`, `float`, `decimal`, `numeric`, `date`, `time`, `timestamp`, `datetime`, `char`, `varchar`, `binary`, `varbinary`, `tinyblob`, `blob`, `mediumblob`, `longblob`, `tinytext`, `text`, `mediumtext`, `longtext`, `set`, `boolean`, `function`, `object`, any other valid object constructor name, or `array` where `arrayOf` is provided with information about the array element types. \[either **type** or **instanceOf** is required]
* **instanceOf** - `string` - (optional) JavaScript class constructor name that the property must be an instance of \[either **type** or **instanceOf** is required]
* **default** - `mixed` - (optional) Sets the default value for the property in the class object
* **allowNull** - `boolean` - (optional) Indicates the property can be null, default is that only `date`, `datetime`, `timestamp`, and custom object types are nullable
* **arrayOf** - `object` - (required for type `array`) A plain object containing the EZ Object `type` or `instanceOf` of the elements of the array -- types can be `bit`, `tinyint`, `smallint`, `mediumint`, `int`, `bigint`, `real`, `double`, `float`, `decimal`, `numeric`, `date`, `time`, `timestamp`, `datetime`, `char`, `varchar`, `binary`, `varbinary`, `tinyblob`, `blob`, `mediumblob`, `longblob`, `tinytext`, `text`, `mediumtext`, `longtext`, `set`, `boolean`, `function`, `object`, or any other valid object constructor name (which can alternatively be used with `instanceOf` instead).  Should also include any other relevant MySQL attributes for the stored properties, such as allowNull, length, unsigned, etc, though not all specifics will be used as the current practice is to store arrays using the family of MySQL `text`-type and `blob`-type fields.  That may change in future versions though where they may be stored in transparent sub-tables, so it's best practice to include the MySQL specifics if you desire future compatability.  **Important Note:** Arrays also therefore don't yet have unlimited size capability, and if the MySQL type used by default isn't big enough, it will be up to you to manually override the `mysqlType` of the `array` property configuration.  \[either **type** or **instanceOf** is required]
* **setTransform(x, propertyConfig)** - `function` - (optional) Function that transforms and returns the property value prior to setting.  The handler for this transform will also be passed the EZ Objects `propertyConfig`, if needed.

### A MySQL property configuration can also have the following:

* **length** - `number` - (optional) MySQL data length for the property \[required for some data types like VARCHAR, optional for others where it's used to determine displayed precision on SELECT'ed data types like FLOAT]
* **decimals** - `number` - (optional) Number of decimals that should be displayed for certain data types when SELECT'ed from the MySQL table
* **unique** - `boolean` - (optional) Indicates the property is a UNIQUE KEY in the MySQL table
* **unsigned** - `boolean` - (optional) Indicates the property should be unsigned in the MySQL table
* **zerofill** - `boolean` - (optional) Indicates the property should be zero-filled in the MySQL table
* **comment** - `string` - (optional) Indicates the property should note the provided comment in the MySQL table
* **characterSet** - `string` - (optional) Indicates the property should use the provided charset in the MySQL table
* **collate** - `string` - (optional) Indicates the property should use the provided collation in the MySQL table
* **autoIncrement** - `boolean` - (optional) Indicates the property should be auto-incremented in the MySQL table
* **mysqlType** - `string` - (optional) Provide the name of a valid MySQL data type in order to override the default, this can be especially useful for saving database space when you know you will be well under the default MySQL type sizes.
* **saveTransform(x, propertyConfig)** - `function` - (optional) Provide a function that transforms and returns the property value prior to saving in the database in order to override the default.  The handler for this transform will also be passed the EZ Objects `propertyConfig`, if needed.
* **loadTransform(x, propertyConfig, db)** - `function` - (optional) Provide a function that transforms and returns the property value after loading from the database in order to override the default.  The handler for this transform will also be passed the EZ Objects `propertyConfig`, if needed, along with the MySQL connection `db` **iff** it was provided as the third argument of the object's `load` method. 

### A MySQL index configuration can have the following (for MySQL table association only):

* **name** - `string` - (required) Name of the index, can be arbitrary, but must be unique and not PRIMARY
* **columns** - `Array` - (required) An array of strings containing property names to be indexed
* **type** - `string` - (optional) Index type, can be BTREE or HASH, defaults to BTREE
* **keyBlockSize** - `number` - (optional) Indicates the index should use the provided key block size
* **withParser** - `string` - (optional) Indicates the index should use the provided parser
* **visible** - `boolean` - (optional) Indicates the index should be visible
* **invisible** - `boolean` - (optional) Indicates the index should be invisible

### Default transforms

There are appropriate setTransform, saveTransform, and loadTransform methods for each EZ Object type.  It is generally recommended that you don't override transforms unless you know what you are doing.  For those who insist on doing so, first reference the default transforms in use in the `ezobjectTypes` array [here](blob/master/index.js#L182)

## Wasted Space

It should be noted that it's possible for there to be considerable space wasted through too liberal use of 
large data types or arrays of large data types.  In many cases this is not an issue, space is cheap right?  However, 
in database tables with massive amounts of records, you may want to do a little due diligence and see 
if you need to override some of the default MySQL types.

For example, let's say that you have the following property config:

`{ name: 'permissions', type: 'array', arrayOf: { type: 'int' } }`

Well, each record will store that field as MySQL type TEXT which takes 65538 bytes of space per entry.  If there are only, say,
25 permissions in your system numbered 1-25 or 0-24, then someone having all 25 permissions, stored using comma separated values
in the database by EZ Objects, would not exceed the 255 bytes provided by a TINYTEXT field.  You may therefore wish to override the
default MySQL type in this case if you have thousands of users in your database, like so:

`{ name: 'permissions', type: 'array', mysqlType: 'tinytext', arrayOf: { type: 'int' } }`

## See Also

There are a couple other examples available that use a broader range of the abilities of EZ Objects MySQL:

* [Example Full](blob/master/example-full.js) - An example where all data types are demonstrated to be operationald, including loading of custom child objects, along with an example where the `mysqlType`, `saveTransform`, and `loadTransform` of a property configuration are overridden.
* [Example Nested Server](blob/master/example-nested.js) - An example where client-side loading of EZ Objects is demonstrated by way of a browserify'd EZ Object model configurations, including loading of custom child objects.
* [Example Nested Models](blob/master/example-nested-models.js)
* [Example Nested Client](blob/master/example-nested.html)
* [Example Nested Browserify Script](blob/master/example-nested-browserify.sh)

## Contributing

Please open an issue on the GitHub repository if you find any broken functionality or other bugs/errors.  Feature requests
will also be accepted, but are not guaranteed to be implemented.

## License

MIT Licensed
