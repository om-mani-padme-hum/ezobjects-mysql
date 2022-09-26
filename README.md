# EZ Objects - MySQL Edition - v11.6.0

EZ Objects (MySQL Edition) is a Node.js module (that can also be usefully [browserify](https://github.com/browserify/browserify)'d) that aims to save 
you lots of time writing class objects that are strictly typed in JavaScript, and can be tied directly to 
MySQL database tables by way of a mix of automatically generated [insert](#myobjectinsertdb)/[update](#myobjectupdatedb)/[load](#myobjectloadfieldvalue-db)/[delete](#myobjectdeletedb) class method signatures.  All you have 
to do is create simple class configurations for each of your objects and then create them using the exported 
[ezobjects.createClass()](#ezobjectscreateclassobjectconfig) function.

* [Installation](#installation)
* [Required Property](#required-property)
* [Basic Example](#basic-example)
* [EZ Object Types](#ez-object-types)
* [Exported Functions](#exported-functions)
* [Basic EZ Object Method Signatures](#basic-ez-object-method-signatures)
* [MySQL EZ Object Method Signatures](#mysql-ez-object-method-signatures)
* [Configuration Specifications](#configuration-specifications)
* [Defining Additional Class Methods](#defining-additional-class-methods)
* [Client Side Usage](#client-side-usage)
* [Wasted Space](#wasted-space)
* [Advanced Example With Each EZ Object Type](#advanced-example-with-each-ez-object-type)
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

## Required Property

**IMPORTANT:** Each of your MySQL EZ Objects **must** include a property of EZ Object type `int` named `id` that will be automatically 
configured to serve as an auto-incrementing primary index in the MySQL table that you are linking your object to.  The `load` method 
will generally be based off the `id` field, unless you specify a [otherSearchProperty](#a-table-linked-mysql-object-configuration-can-also-have-the-following) to load 
by as an alternative.  Also note that you **must** also use the [mysql-await](https://github.com/om-mani-padme-hum/mysql-await) 
module for your database connection for compatability purposes and to allow async/await functionality.  It is simply
a wrapper for the popular [mysql](https://github.com/mysqljs/mysql) module and takes no time to scan and see that nothing 
fishy is going on.

## Basic Example

It might be best to start off with a basic example where we do the following:

1) Configure an EZ Object called `DatabaseRecord`
2) Configure another EZ Object called `UserAccount` that extends from `DatabaseRecord`
3) Create the classes for both using the [ezobjects.createClass()](#ezobjectscreateclassobjectconfig) function
4) Create my *user_accounts* MySQL table using the [ezobjects.createTable()](#ezobjectscreatetableobjectconfig-db) function (if it doesn't already exist)
5) Demonstrate the [instatiation](#new-myobjectdata) of an EZ Object and use of the [getters](#myobjectmyproperty), [setters](#myobjectmypropertyvalue), and [insert](#myobjectinsertdb)/[update](#myobjectupdatedb)/[load](#myobjectloadfieldvalue-db)/[delete](#myobjectdeletedb) class methods that EZ Objects automatically provides.

See below:

```javascript
const ezobjects = require(`ezobjects-mysql;`);
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
  _id: 0,
  _username: `richlowe`,
  _firstName: `Richard`,
  _lastName: `Lowe`,
  _checkingBalance: 0,
  _permissions: [],
  _favoriteDay: null }
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

## Exported Functions

The EZ Objects module exports three functions:

### ezobjects.createTable(objectConfig, db)
 * **Parameter:** objectConfig - `Object` - See [Configuration Specifications](#configuration-specifications)
 * **Parameter:** db - `MySQLConnection` - Created using `mysql-await` module
 * **Description:** A function that creates a MySQL table corresponding to the configuration outlined in `objectConfig`, if it doesn't already exist.

### ezobjects.createClass(objectConfig)
 * **Parameter:** objectConfig - `Object` - See [Configuration Specifications](#configuration-specifications)
 * **Returns:** `mixed` - Your custom created EZ Object in all of its glory
 * **Description:** A function that creates an ES6 class corresponding to the configuration outlined in `objectConfig`, with constructor, initializer, getters, setters, and also delete, insert, load, and update if `tableName` is configured.  The resulting class is both returned from the function and exported from the `ezobjects-mysql` module.
 
### ezobjects.instanceOf(obj, constructorName)
 * **Parameter:** obj - `mixed` - Any object created using an EZ Object class
 * **Parameter:** constructorName - `string`
 * **Returns:** `boolean`
 * **Description:** A function that tests whether a given object `obj` is an instance of class `constructorName`, meaning `constructorName` is the name of the object's constructor, or the name of any constructor in the object's prototype chain.

## Basic EZ Object Method Signatures

These are the object method signatures even the most basic of EZ Objects will have:

### new MyObject([data])
 * **Parameter:** data - `Object` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the plain object `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() and then JSON.parse() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### new MyObject([data])
 * **Parameter:** data - `string` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any provided key/value pairs in the JSON encoded string `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.

### new MyObject([data])
 * **Parameter:** data - `MyObject` - (optional)
 * **Description:** Create a new MyObject object and initialize it using either defaults or any getter functions in the EZ Object `data`.

### MyObject.init([data])
 * **Parameter:** data - `Object`
 * **Description:** Initialize this object using either defaults or any provided key/value pairs in the plain object `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() and then JSON.parse() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.  This is also the method used by the constructor.  

### MyObject.init([data])
 * **Parameter:** data - `Object`
 * **Description:** Initialize this object using either defaults or any provided key/value pairs in the JSON0-encoded string `data`.  Keys can either be equal to the name of a property, or they can have an underscore before the name of a property, as would be the case if you were to JSON.stringify() and then JSON.parse() an EZ Object.  This allows for easy transferability in cases where JSON is used as the transfer medium.  This is also the method used by the constructor.  

### MyObject.init([data])
 * **Parameter:** data - `MyObject`
 * **Description:** Initialize this object using either defaults or any provided getter functions in the EZ Object `data`.  This is also the method used by the constructor.
 
In addition, each property you define will have a single method that is a getter and setter, and it will have the following signatures:

### MyObject.myProperty()
 * **Returns:** `mixed`
 * **Description:** Get the value of the property.
 
### MyObject.myProperty(value)
 * **Parameter:** value - `mixed`
 * **Throws:** `TypeError` if `value` is not of the correct javascript data type for myProperty
 * **Returns:** `this`
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

### MyObject.load(mysqlRow[, db[, propertiesToInclude[, options]]]))
 * **Parameter:** mysqlRow `RowDataPacket` - A MySQL `RowDataPacket` returned as part of a MySQL result set
 * **Parameter:** db - `Object` - (optional)
 * **Parameter:** propertiesToInclude - `Array` - (optional) Properties to load (or not load if inverse option is used)
 * **Parameter:** options - `Object` - (optional) Desired options (currently just inverse = true/false)
 * **Description:** Load any configured properties from key/value pairs in  `mysqlRow`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.

### MyObject.load(obj[, db,[ propertiesToInclude[, options]]]))
 * **Parameter:** obj Object
 * **Parameter:** db - `Object` - (optional)
 * **Parameter:** propertiesToInclude - `Array` - (optional) Properties to load (or not load if inverse option is used)
 * **Parameter:** options - `Object` - (optional) Desired options (currently just inverse = true/false)
 * **Description:** Load any configured properties from key/value pairs in `obj`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.

### MyObject.load(id, db[, propertiesToInclude[, options]]))
 * **Parameter:** id number The value of the `id` property of the record you wish to load
 * **Parameter:** db - `Object`
 * **Parameter:** propertiesToInclude - `Array` - (optional) Properties to load (or not load if inverse option is used)
 * **Parameter:** options - `Object` - (optional) Desired options (currently just inverse = true/false)
 * **Description:** Load the record in database `db`, table `tableName`, that has its `id` field equal to provided `id` parameter.

### MyObject.load(propertyValue, db[, propertiesToInclude[, options]])
 * **Parameter:** propertyValue - `mixed` - The value of the `otherSearchProperty` property of the record you wish to load
 * **Parameter:** db - `Object`
 * **Parameter:** propertiesToInclude - `Array` - (optional) Properties to load (or not load if inverse option is used)
 * **Parameter:** options - `Object` - (optional) Desired options (currently just inverse = true/false)
 * **Description:** Load the record in database `db`, table `tableName`, that has its `otherSearchProperty` field equal to provided `propertyValue` parameter.  Here, the actual field name of `otherSearchProperty` is provided in the object configuration, see the configuration section below.

### MyObject.load(url[, db])
 * **Parameter:** url - `string` - The URL of a back-end that provides JSON data compatible with this object's initializer
 * **Parameter:** db - `Object`
 * **Description:** Load any configured properties from the JSON-encoded key/value pairs obtained from `url`.  You can optionally pass the database `db` if you need it to be provided as a third argument to any loadTransform handlers defined for configured properties.
 * **Note:** This signature is useful only when your classes are standalone [browserify](https://github.com/browserify/browserify)'d and requires you to implement a backend at `url` that will output the JSON.  (This signature no longer requires jQuery to use)

### MyObject.update(db)
 * **Parameter:** db - `Object`
 * **Description:** Update the record in database `db`, table `tableName`, with its `id` field equal to the `id` property of this object, using this object's property values.

## Configuration Specifications

See the following for how to configure your EZ Objects:

### A basic MySQL object configuration can have the following:

* **className** - `string` - (required) Name of the class
* **properties** - `Array` - (optional) An array of property configurations that the object (and MySQL table, if applicable) should have corresponding properties for
* **extends** - `mixed` - (optional) The class that the new EZ Object should be extended from \[required to extend EZ Object]
* **extendsConfig** - `object` - (optional) The EZ Object configuration for the EZ Object that is being extended from \[required to extend EZ Object]
* **indexes** - `Array` - (optional) An array of MySQL index configurations that should be created in the MySQL table

### A table-linked MySQL object configuration can also have the following:

* **tableName** - `string` - (optional) Provide if object should be linked with MySQL database table
* **otherSearchProperty** - `string` - (optional) The name of a **unique** property that you want to be able to load with as an alternative to the mandatory `id` property.  Note the `id` property is still required.
* **url** - `string` - (optional) The URL of a back-end that will provide a JSON.stringify output of the EZ Object for [browserify](https://github.com/browserify/browserify)'d loading of the object using an AJAX background request.  For now, the URL must take the ID # of the record at the very end, i.e. http://go.to/myObject/load/{ID#}

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

There are appropriate setTransform, saveTransform, and loadTransform methods for each EZ Object type.  It is generally recommended that you don't override transforms unless you know what you are doing.  For those who insist on doing so, first reference the default transforms in use in the `ezobjectTypes` array [here](index.js#L182)

## Defining Additional Class Methods

Defining additional class methods is really just a matter of adding the functions to the class prototype.

```javascript
const ezobjects = require(`ezobjects-mysql`);

/** Configure material */
const materialConfig = {
  className: `Material`,
  tableName: `materials`,
  properties: [
    { name: `name`, type: `varchar`, length: 32 },
    { name: `density`, type: `double` },
    { name: `volume`, type: `double` }
  ]
};

/** Create material class */
const Material = ezobjects.createClass(materialConfig);

/** Simply add weight function to the class prototype after creating it with createClass() */
Material.prototype.weight = function () {
  return this.density() * this.volume();
};
```

## Client Side Usage

There is another example available that demonstrates the [browserify](https://github.com/browserify/browserify)'d capabilities of EZ Objects by loading objects client-side over an Ajax back-end:

* [Example Nested Server](example-nested.js)
* [Example Nested Models](example-nested-models.js)
* [Example Nested Client](example-nested.html)
* [Example Nested Browserify Script](example-nested-browserify.sh)

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

## Advanced Example With Each EZ Object Type

```javascript
/** Require external modules */
const ezobjects = require(`ezobjects-mysql`);
const fs = require(`fs`);
const util = require(`util`);
const mysql = require(`mysql-await`);

/** Connect to the MySQL database using login info stored externally */
const db = mysql.createConnection(JSON.parse(fs.readFileSync(`mysql-config.json`)));

/** 
 * Configure a new EZ Object class called Example that tests out the
 * various data types supported.
 *
 * VERY IMPORTANT: 
 *
 * All MySQL EZ Objects MUST have an integer `id` field that will serve 
 * as an auto-incrementing primary index.
 */
const configExample = {
  tableName: `examples`,
  className: `Example`,
  properties: [
    { name: `id`, type: `int` },
    { name: `bitExample`, type: `bit`, length: 2 },
    { name: `tinyintExample`, type: `tinyint` },
    { name: `tinyintExample2`, type: `tinyint`, unsigned: true, zerofill: true },
    { name: `smallintExample`, type: `smallint` },
    { name: `mediumintExample`, type: `mediumint` },
    { name: `intExample`, type: `int` },
    { name: `bigintExample`, type: `bigint` },
    { name: `doubleExample`, type: `double` },
    { name: `floatExample`, type: `float` },
    { name: `decimalExample`, type: `decimal`, length: 5, decimals: 3 },
    { name: `numericExample`, type: `numeric`, length: 8, decimals: 5 },
    { name: `dateExample`, type: `date` },
    { name: `timeExample`, type: `time` },
    { name: `timestampExample`, type: `timestamp` },
    { name: `datetimeExample`, type: `datetime` },
    { name: `charExample`, type: `char`, length: 2 },
    { name: `charExample2`, type: `char`, length: 2, characterSet: `latin1`, collate: `latin1_german1_ci` },
    { name: `varcharExample`, type: `varchar`, length: 40 },
    { name: `varcharExample2`, type: `varchar`, length: 40, allowNull: true },
    { name: `binaryExample`, type: `binary`, length: 4 },
    { name: `varbinaryExample`, type: `varbinary`, length: 4 },
    { name: `tinyblobExample`, type: `tinyblob` },
    { name: `blobExample`, type: `blob` },
    { name: `mediumblobExample`, type: `mediumblob` },
    { name: `longblobExample`, type: `longblob` },
    { name: `tinytextExample`, type: `tinytext` },
    { name: `textExample`, type: `text` },
    { name: `mediumtextExample`, type: `mediumtext` },
    { name: `longtextExample`, type: `longtext` },
    { name: `setExample`, type: `set`, values: [`a`, `b`, `c`, `d`] },
    { name: `booleanExample`, type: `boolean` },
    { name: `functionExample`, type: `function` },
    { name: `plainObjectExample`, type: `object` },
    { name: `ezobjectTypeExample`, type: `OtherObj` },
    { name: `ezobjectInstanceExample`, instanceOf: `OtherObj` },
    { name: `ezobjectInstanceExample2`, instanceOf: `OtherObj`, store: false },
    
    { name: `bitArrayExample`, type: `Array`, arrayOf: { type: `bit`, length: 2 } },
    { name: `tinyintArrayExample`, type: `Array`, arrayOf: { type: `tinyint` } },
    { name: `tinyintArrayExample2`, type: `Array`, arrayOf: { type: `tinyint`, unsigned: true, zerofill: true } },
    { name: `smallintArrayExample`, type: `Array`, arrayOf: { type: `smallint` } },
    { name: `mediumintArrayExample`, type: `Array`, arrayOf: { type: `mediumint` } },
    { name: `intArrayExample`, type: `Array`, arrayOf: { type: `int` } },
    { name: `bigintArrayExample`, type: `Array`, arrayOf: { type: `bigint` } },
    { name: `doubleArrayExample`, type: `Array`, arrayOf: { type: `double` } },
    { name: `floatArrayExample`, type: `Array`, arrayOf: { type: `float` } },
    { name: `decimalArrayExample`, type: `Array`, arrayOf: { type: `decimal`, length: 5, decimals: 3 } },
    { name: `numericArrayExample`, type: `Array`, arrayOf: { type: `numeric`, length: 8, decimals: 5 } },
    { name: `dateArrayExample`, type: `Array`, arrayOf: { type: `date` } },
    { name: `timeArrayExample`, type: `Array`, arrayOf: { type: `time` } },
    { name: `timestampArrayExample`, type: `Array`, arrayOf: { type: `timestamp` } },
    { name: `datetimeArrayExample`, type: `Array`, arrayOf: { type: `datetime` } },
    { name: `charArrayExample`, type: `Array`, arrayOf: { type: `char`, length: 2 } },
    { name: `charArrayExample2`, type: `Array`, arrayOf: { type: `char`, length: 2, characterSet: `latin1`, collate: `latin1_german1_ci` } },
    { name: `varcharArrayExample`, type: `Array`, arrayOf: { type: `varchar`, length: 40 } },
    { name: `varcharArrayExample2`, type: `Array`, arrayOf: { type: `varchar`, length: 40, allowNull: true } },
    { name: `binaryArrayExample`, type: `Array`, arrayOf: { type: `binary`, length: 4 } },
    { name: `varbinaryArrayExample`, type: `Array`, arrayOf: { type: `varbinary`, length: 4 } },
    { name: `tinyblobArrayExample`, type: `Array`, arrayOf: { type: `tinyblob` } },
    { name: `blobArrayExample`, type: `Array`, arrayOf: { type: `blob` } },
    { name: `mediumblobArrayExample`, type: `Array`, arrayOf: { type: `mediumblob` } },
    { name: `longblobArrayExample`, type: `Array`, arrayOf: { type: `longblob` } },
    { name: `tinytextArrayExample`, type: `Array`, arrayOf: { type: `tinytext` } },
    { name: `textArrayExample`, type: `Array`, arrayOf: { type: `text` } },
    { name: `mediumtextArrayExample`, type: `Array`, arrayOf: { type: `mediumtext` } },
    { name: `longtextArrayExample`, type: `Array`, arrayOf: { type: `longtext` } },
    { name: `setArrayExample`, type: `Array`, arrayOf: { type: `set`, values: [`a`, `b`, `c`, `d`] } },
    { name: `booleanArrayExample`, type: `Array`, arrayOf: { type: `boolean` } },
    { name: `functionArrayExample`, type: `Array`, arrayOf: { type: `function` } },
    { name: `plainObjectArrayExample`, type: `Array`, arrayOf: { type: `object` } },
    { name: `ezobjectTypeArrayExample`, type: `Array`, arrayOf: { type: `OtherObj` } },
    { name: `ezobjectInstanceArrayExample`, type: `Array`, arrayOf: { instanceOf: `OtherObj` } },
    { name: `ezobjectInstanceArrayExample2`, type: `Array`, arrayOf: { instanceOf: `OtherObj` }, store: false },
  ],
  indexes: [
    { name: `varcharExample`, type: `BTREE`, columns: [ `varcharExample` ] },
    { name: `charExample`, type: `HASH`, columns: [ `charExample` ] }
  ]
};

/** Create the Example class */
const Example = ezobjects.createClass(configExample);

/** Configure a simple `other` object for use in the example */
const configOtherObj = {
  className: `OtherObj`,
  tableName: `other_objects`,
  properties: [
    { name: `id`, type: `int` },
    { name: `name`, type: `varchar`, length: 40 }
  ]
};

/** Create the OtherObj class */
const OtherObj = ezobjects.createClass(configOtherObj);

/** Configure an extended object for use in the example */
const configExtendedObj = {
  className: `ExtendedObj`,
  tableName: `extended_objects`,
  extends: OtherObj,
  extendsConfig: configOtherObj,
};

/** Create the ExtendedObj class */
const ExtendedObj = ezobjects.createClass(configExtendedObj); 

/** Self-executing async wrapper so we can await results */
(async () => {
  try {
    /** Create example table if it doesn`t already exist */
    await ezobjects.createTable(configExample, db);

    /** Create other object table if it doesn`t already exist */
    await ezobjects.createTable(configOtherObj, db);

    /** Create extended object table if it doesn`t already exist */
    await ezobjects.createTable(configExtendedObj, db);

    const otherObj1 = new OtherObj({ name: `Type Example 1` });
    const otherObj2 = new OtherObj({ name: `Type Example 2` });
    const extendedObj1 = new ExtendedObj({ name: `Instance Example Stored 1` });
    const extendedObj2 = new ExtendedObj({ name: `Instance Example Stored 2` });
    const extendedObj3 = new ExtendedObj({ name: `Instance Example Not Stored 1` });
    const extendedObj4 = new ExtendedObj({ name: `Instance Example Not Stored 2` });

    /** 
     * Insert other objects and extended objects into the database.
     * 
     * Note: This must be done before inserting the example so that
     * the other objects and extended objects have ID's to store!
     **/
    await otherObj1.insert(db);
    await otherObj2.insert(db);
    await extendedObj1.insert(db);
    await extendedObj2.insert(db);

    /** Create new example object, initializing with object passed to constructor */
    const example = new Example({
      bitExample: Buffer.from([0b1, 0b0]),
      tinyintExample: -128,
      tinyintExample2: 255,
      smallintExample: -32767,
      mediumintExample: -8388608,
      intExample: -2147483648,
      // bigintExample: -9223372036854775808, Gives ER_WARN_DATA_OUT_OF_RANGE error due to bug?
      doubleExample: 193448295822329038402340234.23840923804823094809234245,
      floatExample: 1927492498374.2348927395,
      decimalExample: 23.452,
      numericExample: 942.28734,
      dateExample: new Date(`1986-06-20`),
      timeExample: `-838:59:59`,
      timestampExample: new Date(`2011-07-16T04:52:23-06:00`),
      datetimeExample: new Date(`2011-07-16T04:52:23-06:00`),
      charExample: `AU`,
      charExample2: `ÄÜ`,
      varcharExample: `Varchar Example`,
      varcharExample2: null,
      binaryExample: Buffer.from([0x04, 0x7F, 0x13, 0x38]),
      varbinaryExample: Buffer.from([0x04, 0x7F]),
      tinyblobExample: Buffer.from(`I am a tiny blob up to 256 bytes`),
      blobExample: Buffer.from(`I am a bigger blob up to 65 kB`),
      mediumblobExample: Buffer.from(`I am a bigger blob up to 16 MB`),
      longblobExample: Buffer.from(`I am a bigger blob up to 4 GB`),
      tinytextExample: `I am a tiny text up to 256 bytes`,
      textExample: `I am a bigger text up to 65 kB`,
      mediumtextExample: `I am a bigger text up to 16 MB`,
      longtextExample: `I am a bigger text up to 4 GB`,
      setExample: new Set([`a`, `d`, `d`]),
      booleanExample: true,
      functionExample: (arg) => { return `I am ${arg}`; },
      plainObjectExample: { a: `I am A`, 14: `Plain Object` },
      ezobjectTypeExample: otherObj1,
      ezobjectInstanceExample: extendedObj1,
      ezobjectInstanceExample2: extendedObj3,

      bitArrayExample: [Buffer.from([0b1, 0b0]), Buffer.from([0b0, 0b1])],
      tinyintArrayExample: [-128, 128],
      tinyintArrayExample2: [0, 255],
      smallintArrayExample: [-32767, 32767],
      mediumintArrayExample: [-8388608, 8388608],
      intArrayExample: [-2147483648, 2147483648],
      bigintArrayExample: [-9223372036854775808, 9223372036854775808],
      doubleArrayExample: [-193448295822329038402340234.23840923804823094809234245, 193448295822329038402340234.23840923804823094809234245],
      floatArrayExample: [-1927492498374.2348927395, 1927492498374.2348927395],
      decimalArrayExample: [-23.452, 23.452],
      numericArrayExample: [-942.28734, 942.28734],
      dateArrayExample: [new Date(`06-20-1986`), new Date(`11-02-1909`)],
      timeArrayExample: [`-838:59:59`, `838:59:59`],
      timestampArrayExample: [new Date(`2011-07-16T04:52:23-06:00`), new Date(`2013-04-26T17:04:13-06:00`)],
      datetimeArrayExample: [new Date(`2011-07-16T04:52:23-06:00`), new Date(`2013-04-26T17:04:13-06:00`)],
      charArrayExample: [`AU`, `CD`],
      charArrayExample2: [`ÄÜ`, `CD`],
      varcharArrayExample: [`Varchar Example`, `Another Varchar Example`],
      varcharArrayExample2: [null, `Varchar Example 2`],
      binaryArrayExample: [Buffer.from([0x04, 0x7F, 0x13, 0x38]), Buffer.from([0xA3, 0x09])],
      varbinaryArrayExample: [Buffer.from([0x04, 0x7F]), Buffer.from([0xA3, 0x09, 0xDC])],
      tinyblobArrayExample: [Buffer.from(`I am a tiny blob up to 256 bytes`), Buffer.from(`I am another tiny blob up to 256 bytes`)],
      blobArrayExample: [Buffer.from(`I am a bigger blob up to 65 kB`), Buffer.from(`I am another bigger blob up to 65 kB`)],
      mediumblobArrayExample: [Buffer.from(`I am a bigger blob up to 16 MB`), Buffer.from(`I am another bigger blob up to 16 MB`)],
      longblobArrayExample: [Buffer.from(`I am a bigger blob up to 4 GB`), Buffer.from(`I am another bigger blob up to 4 GB`)],
      tinytextArrayExample: [`I am a tiny text up to 256 bytes`, `I am another tiny text up to 256 bytes`],
      textArrayExample: [`I am a bigger text up to 65 kB`, `I am another bigger text up to 65 kB`],
      mediumtextArrayExample: [`I am a bigger text up to 16 MB`, `I am another bigger text up to 16 MB`],
      longtextArrayExample: [`I am a bigger text up to 4 GB`, `I am another bigger text up to 4 GB`],
      setArrayExample: [new Set([`a`, `d`]), new Set([`a`, `c`, `d`, `d`])],
      booleanArrayExample: [false, true],
      functionArrayExample: [(arg) => { return `I am ${arg} 1`; }, (arg) => { return `I am ${arg} 2`; }],
      plainObjectArrayExample: [{ a: `I am A`, 14: `Plain Object` }, { and: `So am I too a`, 930: `Plain Object` }],
      ezobjectTypeArrayExample: [otherObj1, otherObj2],
      ezobjectInstanceArrayExample: [extendedObj1, extendedObj2],
      ezobjectInstanceArrayExample2: [extendedObj3, extendedObj4]
    });

    /** Log the initialized example object */
    console.log(`Initialized example object:`);
    console.log(`${util.inspect(example, { depth: null })}\n`);

    /** Insert example into the database */
    await example.insert(db);

    /** Get the inserted ID */
    const id = example.id();
    
    /** Create a second example object */
    const example2 = new Example();
    
    console.log(`Loading previous example by ID# ${id}...`);

    /** Attempt to load the original example from the database into example2 */
    await example2.load(id, db);
        
    /** Test stored anonymous function */
    console.log(`${example2.functionExample()(`Rich`)}\n`);
  
    /** Log the database loaded example object */
    console.log(`Database loaded example object:`);
    console.log(util.inspect(example2, { depth: null }));
    
    /** To demonstrate the ability to override the MySQL type, create config for example override */
    const exampleOverrideConfig = {
      tableName: `example_overrides`,
      className: `ExampleOverride`,
      properties: [
        { name: `id`, type: `int` },
        { 
          name: `examples`, 
          type: `array`, 
          mysqlType: `tinytext`, 
          arrayOf: { type: `Example` }, 
          saveTransform: x => x.map(y => y.id()).join(`,`), 
          loadTransform: async (x, property, db) => { 
            const arr = []; 
            
            for ( let i = 0, list = x === `` ? [] : x.split(`,`), i_max = list.length; i < i_max; i++ )
              arr.push(await (new Example()).load(parseInt(list[i]), db)); /** You can also use ezobjects.Example from anywhere */
          
            return arr; 
          }
        }
      ]
    };
    
    /** Create example override class */
    const ExampleOverride = ezobjects.createClass(exampleOverrideConfig);
    
    /** Create example overrides table if it doesn`t already exist */
    await ezobjects.createTable(exampleOverrideConfig, db);
    
    /** Create new example override */
    const exampleOverride = new ExampleOverride();
    
    /** Let's just push on the two previous example objects we created, which are both the same record */
    exampleOverride.examples().push(example);
    exampleOverride.examples().push(example2);
    
    /** Insert our example override into the database */
    await exampleOverride.insert(db);
    
    console.log(exampleOverride);
    
    /** Create another example override */
    const exampleOverride2 = new ExampleOverride();
    
    /** Load it using the ID of the previous override */
    await exampleOverride2.load(exampleOverride.id(), db);
    
    /** As you can see, the two log outputs are the same, demonstrating the success of the MySQL override and change of transforms */
    console.log(exampleOverride2);
  } catch ( err ) {
    /** Cleanly log any errors */
    console.log(err.message);
  } finally {
    /** Close database connection */
    await db.awaitEnd();
  }
})();
```

## Contributing

Please open an issue on the GitHub repository if you find any broken functionality or other bugs/errors.  Feature requests
will also be accepted, but are not guaranteed to be implemented.

## License

MIT Licensed
