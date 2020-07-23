/** Require external modules */
const ezobjects = require(`./index`);
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
    console.log(err);
  } finally {
    /** Close database connection */
    await db.awaitEnd();
  }
})();