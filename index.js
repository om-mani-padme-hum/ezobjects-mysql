/**
 * @module ezobjects-mysql
 * @copyright 2018 Rich Lowe
 * @license MIT
 * @description Easy automatic class creation using simple configuration objects.  Capable
 * of automatically creating a matching MySQL table and generating delete(), insert(), load(), 
 * and update() methods in addition to the constructor, initializer, and getters/setters for
 * all configured properties.
 */

/** Require external modules */
const url = require(`url`);
const moment = require(`moment`);

/** Require local modules */
const mysqlConnection = require(`./mysql-connection`);

/** Figure out proper parent scope between node (global) and browser (window) */
let parent;

if ( typeof window !== `undefined` )
  parent = window;
else
  parent = global;

/** Define default set transform for non-array types */
const setTransform = (x, property) => {
  if ( x === null && !property.allowNull )
    throw new TypeError(`${property.className}.${property.name}(): Null value passed to '${property.type}' setter that doesn't allow nulls.`);
  else if ( x && property.ezobjectType.jsType == 'number' && typeof x !== 'number' )
    throw new TypeError(`${property.className}.${property.name}(): Non-numeric value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'string' && typeof x !== 'string' )
    throw new TypeError(`${property.className}.${property.name}(): Non-string value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'boolean' && typeof x !== 'boolean' )
    throw new TypeError(`${property.className}.${property.name}(): Non-boolean value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'function' && typeof x !== 'function' )
    throw new TypeError(`${property.className}.${property.name}(): Non-function value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'Date' && ( typeof x !== 'object' || x.constructor.type == 'Date' ) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Date value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'Buffer' && ( typeof x !== 'object' || x.constructor.type == 'Buffer' ) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Buffer value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'Set' && ( typeof x !== 'object' || x.constructor.type == 'Set' ) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Set value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'PlainObject' && ( typeof x !== 'object' || x.constructor.type == 'Object' ) )
    throw new TypeError(`${property.className}.${property.name}(): Non-PlainObject value passed to '${property.type}' setter.`);
  else if ( x && property.ezobjectType.jsType == 'object' && ( typeof x !== 'object' || ( typeof property.type == 'string' && x.constructor.name != property.originalType ) || ( typeof property.instanceOf === 'string' && !module.exports.instanceOf(x, property.instanceOf) ) ) )
    throw new TypeError(`${property.className}.${property.name}(): Invalid value passed to '${typeof property.type === 'string' ? property.originalType : property.instanceOf}' setter.`);
  
  if ( property.ezobjectType.hasDecimals )
    return x === null ? null : parseFloat(x);
  else if ( property.ezobjectType.jsType == 'number' )
    return x === null ? null : parseInt(x);
  else if ( property.ezobjectType.jsType == 'boolean' )
    return x === null ? null : (x ? true : false);
  else
    return x === null ? null : x;
};

/** Define default set transform for array types */
const setArrayTransform = (x, property) => {
  if ( x === null && !property.allowNull )
    throw new TypeError(`${property.className}.${property.name}(): Null value passed to 'Array' setter that doesn't allow nulls.`);
  else if ( !(x instanceof Array) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Array value passed to 'Array' setter.`);
  else if ( x && x.some(y => y === null && !property.arrayOf.allowNull) )
    throw new TypeError(`${property.className}.${property.name}(): Null value passed as element of 'Array[${property.arrayOf.type}]' setter that doesn't allow null elements.`);
  
  let arr = [];
  
  if ( property.ezobjectType.jsType == 'number' && x && x.some(y => isNaN(y) && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-numeric value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'string' && x && x.some(y => typeof y !== 'string' && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-string value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'boolean' && x && x.some(y => typeof y !== 'boolean' && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-boolean value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'function' && x && x.some(y => typeof y !== 'function' && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-function value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'Date' && x && x.some(y => ( typeof y !== 'object' || y.constructor.name != 'Date' ) && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Date value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'Buffer' && x && x.some(y => ( typeof y !== 'object' || y.constructor.name != 'Buffer' ) && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Buffer value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'Set' && x && x.some(y => ( typeof y !== 'object' || y.constructor.name != 'Set' ) && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-Set value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'PlainObject' && x && x.some(y => ( typeof y !== 'object' || y.constructor.name != 'Object' ) && y !== null) )
    throw new TypeError(`${property.className}.${property.name}(): Non-PlainObject value passed as element of Array[${property.arrayOf.type}] setter.`);
  else if ( property.ezobjectType.jsType == 'object' && x && x.some(y => y !== null && (typeof y !== 'object' || ( typeof property.arrayOf.type == 'string' && y.constructor.name != property.arrayOf.type ) || ( typeof property.arrayOf.instanceOf === 'string' && !module.exports.instanceOf(y, property.arrayOf.instanceOf) ))) )
    throw new TypeError(`${property.className}.${property.name}(): Invalid value passed as element of Array[${typeof property.arrayOf.type === 'string' ? property.arrayOf.type : property.arrayOf.instanceOf}] setter.`);
  
  if ( property.arrayOf.ezobjectType.hasDecimals )
    arr = x.map(y => y === null ? null : parseFloat(y));
  else if ( property.arrayOf.ezobjectType.jsType == 'number' )
    arr = x.map(y => y === null ? null : parseInt(y));
  else if ( property.arrayOf.ezobjectType.jsType == 'boolean' )
    arr = x.map(y => y === null ? null : (y ? true : false));
  else
    arr = x.map(y => y === null ? null : y);

  Object.defineProperty(arr, 'origPush', { enumerable: false, value: arr.push });
  Object.defineProperty(arr, 'origUnshift', { enumerable: false, value: arr.unshift });
  Object.defineProperty(arr, 'origFill', { enumerable: false, value: arr.fill });
  
  Object.defineProperty(arr, 'push', {
    enumerable: false,
    value: function () { for ( let i = 0, i_max = arguments.length; i < i_max; i++ ) this.origPush(setTransform(arguments[i], property)); return this.length; }
  });
  
  Object.defineProperty(arr, 'unshift', {
    enumerable: false,
    value: function () { for ( let i = 0, i_max = arguments.length; i < i_max; i++ ) this.origUnshift(setTransform(arguments[i], property)); return this.length; }
  });
  
  Object.defineProperty(arr, 'fill', {
    enumerable: false,
    value: function (value, start, end) { return this.origFill(setTransform(value, property), start, end); }
  });
    
  return x === null ? null : arr;
};

/** Define the EZ Object types, their associated JavaScript and MySQL types, defaults, quirks, transforms, etc... */
const ezobjectTypes = [
  { type: `bit`, jsType: 'Buffer', mysqlType: `bit`, default: Buffer.from([]), hasLength: true, setTransform: setTransform, saveTransform: x => parseInt(x.join(''), 2) },
  { type: `tinyint`, jsType: 'number', mysqlType: `tinyint`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `smallint`, jsType: 'number', mysqlType: `smallint`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `mediumint`, jsType: 'number', mysqlType: `mediumint`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `int`, jsType: 'number', mysqlType: `int`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `integer`, jsType: 'number', mysqlType: `integer`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `bigint`, jsType: 'number', mysqlType: `bigint`, default: 0, hasLength: true, hasUnsignedAndZeroFill: true, setTransform: setTransform, loadTransform: x => parseInt(x) },
  { type: `real`, jsType: 'number', mysqlType: `real`, default: 0, hasLength: true, hasDecimals: true, hasUnsignedAndZeroFill: true, lengthRequiresDecimals: true, setTransform: setTransform },
  { type: `double`, jsType: 'number', mysqlType: `double`, default: 0, hasLength: true, hasDecimals: true, hasUnsignedAndZeroFill: true, lengthRequiresDecimals: true, setTransform: setTransform },
  { type: `float`, jsType: 'number', mysqlType: `float`, default: 0, hasLength: true, hasDecimals: true, hasUnsignedAndZeroFill: true, lengthRequiresDecimals: true, setTransform: setTransform },
  { type: `decimal`, jsType: 'number', mysqlType: `decimal`, default: 0, hasLength: true, hasDecimals: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `numeric`, jsType: 'number', mysqlType: `numeric`, default: 0, hasLength: true, hasDecimals: true, hasUnsignedAndZeroFill: true, setTransform: setTransform },
  { type: `date`, jsType: 'Date', mysqlType: `date`, default: new Date(0), saveTransform: x => moment(x).format(`YYYY-MM-DD`), loadTransform: x => new Date(x), setTransform: setTransform },
  { type: `time`, jsType: `string`, mysqlType: `time`, default: '00:00:00', setTransform: setTransform },
  { type: `timestamp`, jsType: 'Date', mysqlType: `timestamp`, default: new Date(0), setTransform: setTransform, saveTransform: x => moment(x).format(`YYYY-MM-DD HH:mm:ss.SSSSSS`), loadTransform: x => new Date(x) },
  { type: `datetime`, jsType: 'Date', mysqlType: `datetime`, default: new Date(0), setTransform: setTransform, saveTransform: x => moment(x).format(`YYYY-MM-DD HH:mm:ss.SSSSSS`), loadTransform: x => new Date(x) },
  { type: `year`, jsType: `number`, mysqlType: `year`, default: 1970, setTransform: setTransform },
  { type: `char`, jsType: `string`, mysqlType: `char`, default: '', hasLength: true, hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `varchar`, jsType: `string`, mysqlType: `varchar`, default: '', hasLength: true, lengthRequired: true, hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `binary`, jsType: `Buffer`, mysqlType: `binary`, default: Buffer.from([]), hasLength: true, setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `varbinary`, jsType: `Buffer`, mysqlType: `varbinary`, default: Buffer.from([]), lengthRequired: true, hasLength: true, setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `tinyblob`, jsType: `Buffer`, mysqlType: `tinyblob`, default: Buffer.from([]), setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `blob`, jsType: `Buffer`, mysqlType: `blob`, default: Buffer.from([]), hasLength: true, setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `mediumblob`, jsType: `Buffer`, mysqlType: `mediumblob`, default: Buffer.from([]), setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `longblob`, jsType: `Buffer`, mysqlType: `longblob`, default: Buffer.from([]), setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => Buffer.from(x) },
  { type: `tinytext`, jsType: `string`, mysqlType: `tinytext`, default: '', hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `text`, jsType: `string`, mysqlType: `text`, default: '', hasLength: true, hasCharacterSetAndCollate: true, setTransform: setTransform},
  { type: `mediumtext`, jsType: `string`, mysqlType: `mediumtext`, default: '', hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `longtext`, jsType: `string`, mysqlType: `longtext`, default: '', hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `enum`, jsType: `string`, mysqlType: `enum`, default: '', hasCharacterSetAndCollate: true, setTransform: setTransform },
  { type: `set`, jsType: `Set`, mysqlType: `set`, default: '', hasCharacterSetAndCollate: true, setTransform: setTransform, saveTransform: x => Array.from(x.values()).join(','), loadTransform: x => new Set(x.split(`,`)) },
  { type: `boolean`, jsType: `boolean`, mysqlType: `tinyint`, default: false, setTransform: setTransform, saveTransform: x => x ? 1 : 0, loadTransform: x => x ? true: false },
  { type: `function`, jsType: `function`, mysqlType: `text`, default: function () {}, setTransform: setTransform, saveTransform: x => x.toString(), loadTransform: x => eval(x) },
  { type: `plainobject`, jsType: `PlainObject`, mysqlType: `text`, default: {}, setTransform: setTransform, saveTransform: x => JSON.stringify(x), loadTransform: x => JSON.parse(x) },
  { type: `other`, jsType: `object`, mysqlType: `int`, default: null, setTransform: setTransform, saveTransform: x => x ? x.id() : -1, loadTransform: async (x, property, db) => await (new parent[typeof property.type === 'string' ? property.originalType : property.instanceOf]).load(x, db) },
  
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `bit`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `tinyint`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `smallint`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `mediumint`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `int`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `integer`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `bigint`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `real`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseFloat(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `double`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseFloat(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `float`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseFloat(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `decimal`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseFloat(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `numeric`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseFloat(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `date`, setTransform: setArrayTransform, saveTransform: x => x.map(y => moment(y).format(`YYYY-MM-DD`)).join(`,`), loadTransform: x => x.split(`,`).map(y => new Date(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `time`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `timestamp`, setTransform: setArrayTransform, saveTransform: x => x.map(y => moment(y).format(`YYYY-MM-DD HH:mm:ss.SSSSSS`)).join(`,`), loadTransform: x => x.split(`,`).map(y => new Date(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `datetime`, setTransform: setArrayTransform, saveTransform: x => x.map(y => moment(y).format(`YYYY-MM-DD HH:mm:ss.SSSSSS`)).join(`,`), loadTransform: x => x.split(`,`).map(y => new Date(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `year`, setTransform: setArrayTransform, saveTransform: x => x.join(`,`), loadTransform: x => x.split(`,`).map(y => parseInt(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `char`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `varchar`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `binary`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `varbinary`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `tinyblob`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `blob`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `longtext`, default: [], arrayOfType: `mediumblob`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `longtext`, default: [], arrayOfType: `longblob`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.join(`|`)).join(`,`), loadTransform: x => x.split(`,`).map(y => Buffer.from(y.split(`|`).map(z => parseInt(z)))) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `tinytext`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `text`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `longtext`, default: [], arrayOfType: `mediumtext`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `longtext`, default: [], arrayOfType: `longtext`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `enum`, setTransform: setArrayTransform, saveTransform: x => x.join(`!&|&!`), loadTransform: x => x.split(`!&|&!`) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `set`, setTransform: setArrayTransform, saveTransform: x => x.map(y => Array.from(y.values()).join(`,`)).join(`!&|&!`), loadTransform: x => x.split(`!&|&!`).map(y => new Set(y.split(`,`))) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `boolean`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y ? 1 : 0).join(`,`), loadTransform: x => x.split(`,`).map(y => y ? true : false) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `function`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.toString()).join(`!&|&!`), loadTransform: x => x.split(`!&|&!`).map(y => eval(y)) },
  { type: `array`, jsType: `Array`, mysqlType: `mediumtext`, default: [], arrayOfType: `PlainObject`, setTransform: setArrayTransform, saveTransform: x => JSON.stringify(x), loadTransform: x => JSON.parse(x) },
  { type: `array`, jsType: `Array`, mysqlType: `text`, default: [], arrayOfType: `other`, setTransform: setArrayTransform, saveTransform: x => x.map(y => y.id()).join(`,`), loadTransform: async (x, property, db) => { const arr = []; for ( let i = 0, list = x.split(`,`), i_max = list.length; i < i_max; i++ ) { if ( !isNaN(parseInt(list[i])) ) arr.push(await (new parent[typeof property.arrayOf.type === 'string' ? property.arrayOf.type : property.arrayOf.instanceOf]).load(parseInt(list[i]), db)); } return arr; } }
];

/** Validate configuration for a single property */
function validatePropertyConfig(property) {  
  /** If name is missing or not a string, throw error */
  if ( typeof property.name !== 'string' )
    throw new Error(`ezobjects.validatePropertyConfig(): Property configured with missing or invalid 'name'.`);

  /** If name is not a valid MySQL column name, throw error */
  if ( !property.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property 'name' not valid MySQL column name, must start with 'a-zA-Z_' and contain only 'a-zA-Z0-9_'.`);
    
  /** If type is missing or not a string, throw error */
  if ( typeof property.type !== 'string' && typeof property.instanceOf !== 'string' )
    throw new Error(`ezobjects.validatePropertyConfig(): Property ${property.name} configured with missing or invalid 'type' and/or 'instanceOf', one of them is required.`);
  
  /** If type is invalid, throw error */
  if ( property.type && typeof property.type !== 'string' )
    throw new Error(`ezobjects.validatePropertyConfig(): Property ${property.name} configured with invalid 'type'.`);
  
  /** If instanceOf is invalid, throw error */
  if ( property.instanceOf && typeof property.instanceOf !== 'string' )
    throw new Error(`ezobjects.validatePropertyConfig(): Property ${property.name} configured with invalid 'instanceOf'.`);

  /** If the original type has not yet been recorded */
  if ( property.type && typeof property.originalType !== 'string' ) {
    /** Store original type with preserved case */
    property.originalType = property.type;
    
    /** Convert type to lower-case for comparison to ezobjectsTypes */
    property.type = property.type.toLowerCase();
  }
  
  /** Attach arrayOf 'ezobjectType' if property type is 'array' */
  if ( property.type == 'array' ) {
    /** If type is 'ARRAY' with no 'arrayOf', throw error */
    if ( typeof property.arrayOf !== 'object' || property.arrayOf.constructor.name != 'Object' )
      throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} with missing or invalid 'arrayOf'.`);

    /** If type is 'ARRAY' with 'arrayOf' containing bad or missing type, throw error */
    if ( typeof property.arrayOf.type != 'string' && typeof property.arrayOf.instanceOf != 'string' )
      throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} with missing or invalid 'arrayOf.type' and/or 'arrayOf.instanceOf', one of them is required.`);

    /** If it's a standard EZ Object type, attach 'ezobjectType' to property for later use */
    property.ezobjectType = ezobjectTypes.find(x => x.type == property.type && x.arrayOfType == property.arrayOf.type );

    /** If no standard type was found, use 'other' type for other objects */
    if ( !property.ezobjectType )
      property.ezobjectType = ezobjectTypes.find(x => x.type == 'array' && x.arrayOfType == 'other' );
    
    /** If it's a standard EZ Object type, attach 'ezobjectType' to property arrayOf type for later use */
    property.arrayOf.ezobjectType = ezobjectTypes.find(x => x.type == property.arrayOf.type);

    /** If no standard type was found, use 'other' type for other objects */
    if ( !property.arrayOf.ezobjectType )
      property.arrayOf.ezobjectType = ezobjectTypes.find(x => x.type == 'other');
    
    /** Fully determine whether to allow nulls for this property */
    if ( typeof property.arrayOf.allowNull !== `boolean` && property.arrayOf.ezobjectType.type != 'other' )
      property.arrayOf.allowNull = false;
    else if ( typeof property.arrayOf.allowNull !== `boolean` )
      property.arrayOf.allowNull = true;
  } else {
    /** If it's a standard EZ Object type, attach 'ezobjectType' to property for later use */
    property.ezobjectType = ezobjectTypes.find(x => x.type == property.type);

    /** If no standard type was found, use 'other' type for other objects */
    if ( !property.ezobjectType )
      property.ezobjectType = ezobjectTypes.find(x => x.type == 'other');
  }
  
  /** If 'length' is provided, make sure it's an integer or NaN */
  if ( !isNaN(property.length) )
    property.length = parseInt(property.length);
  
  /** If 'decimals' is provided, make sure it's an integer or NaN */
  if ( !isNaN(property.decimals) )
    property.decimals = parseInt(property.decimals);
  
  /** Set 'hasDecimals' to false if not defined */
  if ( typeof property.ezobjectType.hasDecimals !== 'boolean' )
    property.ezobjectType.hasDecimals = false;
  
  /** Set 'hasLength' to false if not defined */
  if ( typeof property.ezobjectType.hasLength !== 'boolean' )
    property.ezobjectType.hasDecimals = false;
  
  /** Set 'lengthRequired' to false if not defined */
  if ( typeof property.ezobjectType.lengthRequired !== 'boolean' )
    property.ezobjectType.lengthRequired = false;
  
  /** Set 'hasUnsignedAndZeroFill' to false if not defined */
  if ( typeof property.ezobjectType.hasUnsignedAndZeroFill !== 'boolean' )
    property.ezobjectType.hasUnsignedAndZeroFill = false;
  
  /** Set 'hasCharacterSetAndCollate' to false if not defined */
  if ( typeof property.ezobjectType.hasCharacterSetAndCollate !== 'boolean' )
    property.ezobjectType.hasCharacterSetAndCollate = false;
  
  /** Set 'lengthRequiresDecimals' to false if not defined */
  if ( typeof property.ezobjectType.lengthRequiresDecimals !== 'boolean' )
    property.ezobjectType.lengthRequiresDecimals = false;

  /** Types where length is required, throw error if missing */
  if ( property.ezobjectType.lengthRequired && isNaN(property.length) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} missing required length configuration.`);

  /** Types where decimals are provided, but length is missing */
  if ( property.ezobjectType.hasDecimals && !isNaN(property.decimals) && isNaN(property.length) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} provided decimals without length configuration.`);

  /* If type is VARCHAR or VARBINARY, both of which require length, throw error if length out of bounds */
  if ( ( property.type == `varchar` || property.type == `varbinary` ) && ( property.length <= 0 || property.length > 65535 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 65535.`);

  /* If type is BIT and length is provided, throw error if length out of bounds */
  if ( property.type == `bit` && !isNaN(property.length) && ( property.length <= 0 || property.length > 64 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 64.`);

  /* If type is TINYINT and length is provided, throw error if length out of bounds */
  if ( property.type == `tinyint` && !isNaN(property.length) && ( property.length <= 0 || property.length > 4 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 4.`);

  /* If type is SMALLINT and length is provided, throw error if length out of bounds */
  if ( property.type == `smallint` && !isNaN(property.length) && ( property.length <= 0 || property.length > 6 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 6.`);

  /* If type is MEDIUMINT and length is provided, throw error if length out of bounds */
  if ( property.type == `mediumint` && !isNaN(property.length) && ( property.length <= 0 || property.length > 8 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 8.`);

  /* If type is INT or INTEGER and length is provided, throw error if length out of bounds */
  if ( ( property.type == `int` || property.type == `integer` ) && !isNaN(property.length) && ( property.length <= 0 || property.length > 11 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 11.`);

  /* If type is BIGINT and length is provided, throw error if length out of bounds */
  if ( property.type == `bigint` && !isNaN(property.length) && ( property.length <= 0 || property.length > 20 ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has length out of bounds, must be between 1 and 20.`);

  /* If type can use decimals and decimals are provided, throw error if decimals out of bounds */
  if ( property.ezobjectType.hasDecimals && !isNaN(property.decimals) && ( property.decimals < 0 || property.decimals > property.length ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} has decimals out of bounds, must be between 0 and the configured 'length'.`);

  /** Types where length is provided and so decimals are required, throw error if missing */
  if ( property.ezobjectType.lengthRequiresDecimals && !isNaN(property.length) && isNaN(property.decimals) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} used with length, but without decimals.`);

  /** If type is ENUM or SET and values missing or invalid, throw error */
  if ( ( property.ezobjectType.mysqlType == 'enum' || property.ezobjectType.mysqlType == 'set' ) && ( typeof property.values !== 'object' || property.values.constructor.name != 'Array' ) )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} used with missing or invalid values array.`);
  
  /** If type is ENUM or SET and values exists but is empty, throw error */
  if ( ( property.ezobjectType.mysqlType == 'enum' || property.ezobjectType.mysqlType == 'set' ) && property.values.length == 0 )
    throw new Error(`ezobjects.validatePropertyConfig(): Property '${property.name}' of type ${property.type} used with empty values array, there must be at least one value.`);
  
  /** Create default transform function that doesn't change the input */
  const defaultTransform = x => x;
  
  /** If there is no setter transform, set to default */
  if ( typeof property.setTransform !== `function` )
    property.setTransform = typeof property.ezobjectType == 'object' && typeof property.ezobjectType.setTransform == 'function' ? property.ezobjectType.setTransform : defaultTransform;

  /** If there is no save transform, set to default */
  if ( typeof property.saveTransform !== `function` )
    property.saveTransform = typeof property.ezobjectType == 'object' && typeof property.ezobjectType.saveTransform == 'function' ? property.ezobjectType.saveTransform : defaultTransform;

  /** If there is no load transform, set to default */
  if ( typeof property.loadTransform !== `function` )
    property.loadTransform = typeof property.ezobjectType == 'object' && typeof property.ezobjectType.loadTransform == 'function' ? property.ezobjectType.loadTransform : defaultTransform;
      
  /** Fully determine whether to store properties in database */
  if ( typeof property.store !== `boolean` )
    property.store = true;
  
  /** Fully determine whether to allow nulls for this property */
  if ( typeof property.allowNull !== `boolean` && property.ezobjectType.type != 'other' )
    property.allowNull = false;
  else if ( typeof property.allowNull !== `boolean` )
    property.allowNull = true;
}

/** Validate configuration for a class */
function validateClassConfig(obj) {
  /** If configuration is not plain object, throw error */
  if ( typeof obj != `object` || obj.constructor.name != `Object` )
    throw new Error(`ezobjects.validateClassConfig(): Invalid table configuration argument, must be plain object.`);
    
  /** If configuration has missing or invalid 'className' configuration, throw error */
  if ( typeof obj.className !== 'string' || !obj.className.match(/[A-Za-z_0-9$]+/) )
    throw new Error(`ezobjects.validateClassConfig(): Configuration has missing or invalid 'className', must be string containing characters 'A-Za-z_0-9$'.`);

  /** Add properties array if one wasn't set */
  if ( !obj.properties )
    obj.properties = [];

  /** Make sure properties is array */
  if ( obj.properties && ( typeof obj.properties != 'object' || obj.properties.constructor.name != 'Array' ) )
    throw new Error(`ezobjects.validateClassConfig(): Invalid properties configuration, properties not array.`);
  
  /** Loop through any properties and validate them */
  obj.properties.forEach((property) => {
    property.className = obj.className;
    
    validatePropertyConfig(property);
  });
}

/** Validate configuration for a creating MySQL table based on class configuration */
function validateTableConfig(obj) {  
  /** If configuration has missing or invalid 'tableName' configuration, throw error */
  if ( typeof obj.tableName !== 'string' || !obj.tableName.match(/[a-z_]+/) )
    throw new Error(`ezobjects.validateTableConfig(): Configuration has missing or invalid 'tableName', must be string containing characters 'a-z_'.`);

  validateClassConfig(obj);
}

/*
 * @signature ezobjects.createTable(obj, db)
 * @param obj Object Configuration object
 * @param db MySQLConnection
 * @description A function for automatically generating a MySQL table, if it doesn't already
 * exist, based on the values in the provided configuration object.
 */
module.exports.createTable = async (obj, db) => {
  if ( typeof db != `object` || db.constructor.name != `MySQLConnection` )
    throw new Error(`ezobjects.createTable(): Invalid database argument.`);
  
  /** Validate table configuration */
  validateTableConfig(obj);
  
  /** Helper method that can be recursively called to add all properties to the create query */
  const addPropertiesToCreateQuery = (obj) => {
    /** If this object extends another, recursively add properties from the extended object */
    if ( obj.extendsConfig )
      addPropertiesToCreateQuery(obj.extendsConfig);

    /** Loop through each property */
    obj.properties.forEach((property) => {
      /** If we don't want this property to be stored in the database, don't include it in the create query */
      if ( !property.store )
        return;
      
      /** Add property name and type to query */
      createQuery += `${property.name} ${property.ezobjectType.mysqlType.toUpperCase()}`;

      /** Add value lists for ENUM and SET types */
      if ( property.ezobjectType.mysqlType.toUpperCase() == 'ENUM' || property.ezobjectType.mysqlType.toUpperCase() == 'SET' ) {
        createQuery += `(`;
        
        /** Loop through each value and output */
        property.values.forEach((value) => {
          createQuery += `'${value}', `;
        });
        
        /** Trim extra ', ' from value list, if there was at least one */
        if ( property.values.length > 0 )
          createQuery = createQuery.substr(0, createQuery.length - 2);
        
        createQuery += `)`;
      }
      
      /** Properties with length and/or decimals */
      if ( !isNaN(property.length) && !isNaN(property.decimals) && typeof property.ezobjectType.hasLength == 'boolean' && property.ezobjectType.hasLength && typeof property.ezobjectType.hasDecimals == 'boolean' && property.ezobjectType.hasDecimals )
        createQuery += `(${property.length}, ${property.decimals})`;
      else if ( !isNaN(property.length) && typeof property.ezobjectType.hasLength == 'boolean' && property.ezobjectType.hasLength )
        createQuery += `(${property.length})`;
      
      /** Properties with UNSIGNED */
      if ( typeof property.ezobjectType.hasUnsignedAndZeroFill == `boolean` && property.ezobjectType.hasUnsignedAndZeroFill && typeof property.unsigned == 'boolean' && property.unsigned )
        createQuery += ` UNSIGNED`;

      /** Properties with ZEROFILL */
      if ( typeof property.ezobjectType.hasUnsignedAndZeroFill == `boolean` && property.ezobjectType.hasUnsignedAndZeroFill && typeof property.zerofill == 'boolean' && property.zerofill )
        createQuery += ` ZEROFILL`;

      /** Properties with CHARACTER SET */
      if ( typeof property.ezobjectType.hasCharacterSetAndCollate == `boolean` && property.ezobjectType.hasCharacterSetAndCollate && typeof property.characterSet == 'string' )
        createQuery += ` CHARACTER SET ${property.characterSet}`;

      /** Properties with COLLATE */
      if ( typeof property.ezobjectType.hasCharacterSetAndCollate == `boolean` && property.ezobjectType.hasCharacterSetAndCollate && typeof property.collate == 'string' )
        createQuery += ` COLLATE ${property.collate}`;

      /** Properties with NULL */
      if ( property.allowNull )
        createQuery += ` NULL`;
      else
        createQuery += ` NOT NULL`;

      /** Properties with AUTO_INCREMENT */
      if ( property.autoIncrement || property.name == 'id' )
        createQuery += ` AUTO_INCREMENT`;

      /** Properties with UNIQUE KEY */
      if ( property.unique )
        createQuery += ` UNIQUE KEY`;

      /** Properties with PRIMARY KEY */
      if ( property.name == 'id' )
        createQuery += ` PRIMARY KEY`;

      /** Properties with COMMENT */
      if ( property.comment && typeof property.comment == `string` )
        createQuery += ` COMMENT '${property.comment.replace(`'`, `''`)}'`;

      createQuery += `, `;
    });
  };

  /** Helper method that can be recursively called to add all indexes to the create query */
  const addIndexesToCreateQuery = (obj) => {
    /** If this object extends another, recursively add indexes from the extended object */
    if ( obj.extendsConfig )
      addIndexesToCreateQuery(obj.extendsConfig);

    /** If there are any indexes defined */
    if ( obj.indexes ) {
      /** Loop through each index */
      obj.indexes.forEach((index) => {
        /** Convert the type to upper case for reliable string comparison */
        index.type = index.type.toUpperCase();
        
        /** If type is not defined, default to BTREE */
        if ( typeof index.type !== `string` )
          index.type = `BTREE`;

        /** Validate index settings */
        if ( index.type != `BTREE` && index.type != `HASH` )
          throw new Error(`ezobjects.createTable(): Invalid index type '${index.type}'.`);
        else if ( index.visible && index.invisible )
          throw new Error(`ezobjects.createTable(): Index cannot have both VISIBLE and INVISIBLE options set.`);

        /** Add index name and type to query */
        createQuery += `INDEX ${index.name} USING ${index.type} (`;

        /** Loop through each indexed column and append to query */
        index.columns.forEach((column) => {
          createQuery += `${column}, `;
        });

        /** Trim off extra ', ' from columns */
        createQuery = createQuery.substr(0, createQuery.length - 2);

        /** Close column list */
        createQuery += `)`;

        /** Indexes with KEY_BLOCK_SIZE */
        if ( typeof index.keyBlockSize === `number` )
          createQuery += ` KEY_BLOCK_SIZE ${index.keyBlockSize}`;

        /** Indexes with WITH PARSER */
        if ( typeof index.parserName === `string` )
          createQuery += ` WITH PARSER ${index.parserName}`;

        /** Indexes with COMMENT */
        if ( typeof index.comment === `string` )
          createQuery += ` COMMENT '${index.comment.replace(`'`, ``)}'`;

        /** Indexes with VISIBLE */
        if ( typeof index.visible === `boolean` && index.visible )
          createQuery += ` VISIBLE`;

        /** Indexes with INVISIBLE */
        if ( typeof index.visible === `boolean` && index.invisible )
          createQuery += ` INVISIBLE`;

        createQuery += `, `;
      });
    }
  };

  /** Begin create table query */
  let createQuery = `CREATE TABLE IF NOT EXISTS ${obj.tableName} (`;

  /** Call recursive methods to add properties and indexes to query */
  addPropertiesToCreateQuery(obj);
  addIndexesToCreateQuery(obj);

  /** Trim extra ', ' from property and/or index list */
  createQuery = createQuery.substr(0, createQuery.length - 2);

  /** Close property and/or index list */
  createQuery += `)`;
    
  /** Await query execution and return result */
  return await db.query(createQuery);
};

/**
 * @signature ezobjects.instanceOf(obj, constructorName)
 * @param obj Object
 * @param constructorName string
 * @description A function for determining if an object instance's
 * prototype chain includes a constructor named `constructorName`.
 */
module.exports.instanceOf = (obj, constructorName) => {
  let found = false;
  
  /** Recursive function for determining if ancestral prototype is an instance of the given `constructorName` */
  const isInstance = (obj) => {
    /** If it is an instance of `constructorName`, set found to true */
    if ( obj && obj.constructor && obj.constructor.name == constructorName )
      found = true;
    
    /** If this is an extension of a more fundamental prototype, recursively check it too */
    if ( obj && obj.__proto__ )
      isInstance(obj.__proto__);
  };
  
  /** See if `obj` is an instance of `constructorName` */
  isInstance(obj);
  
  /** Return the result */
  return found;
};

/**
 * @signature ezobjects.createClass(obj)
 * @param obj Object Configuration object
 * @description A function for automatically generating a class object based on
 * the values in the provided configuration object.
 */
module.exports.createClass = (obj) => {
  /** Validate class configuration */
  validateClassConfig(obj);

  /** Create new class on global scope */
  parent[obj.className] = class extends (obj.extends || Object) {
    /** Create constructor */
    constructor(data = {}) {
      /** Initialize super */
      super(data);
      
      /** Initialize object to values in `data` or defaults */
      this.init(data);
    }
    
    /** Create initializer */
    init(data = {}) {
      /** If there is an 'init' function on super, call it */
      if ( typeof super.init === `function` )
        super.init(data);
    
      /** If data is a string, assume it's JSON encoded and try and parse */
      if ( typeof data == `string` ) {
        try {
          data = JSON.parse(data);
        } catch ( err ) {
          throw new Error(`${this.constructor.name}.init(${typeof data}): Initialization string is not valid JSON.`);
        }
      }

      /** Loop through each key/val pair in data */
      Object.keys(data).forEach((key) => {
        /** If key begins with '_' */
        if ( key.match(/^_/) ) {
          /** Create a new key with the '_' character stripped from the beginning */
          Object.defineProperty(data, key.replace(/^_/, ``), Object.getOwnPropertyDescriptor(data, key));
          
          /** Delete the old key that has '_' */
          delete data[key];
        }
      });

      /** Loop through each property in the obj */
      obj.properties.forEach((property) => {
        /** Initialize types to defaults */
        this[property.name](data[property.name] || property.default || property.ezobjectType.default);
      });
    }
  };
  
  /** Loop through each property in the obj */
  obj.properties.forEach((property) => {  
    /** Create class method on prototype */
    parent[obj.className].prototype[property.name] = function (arg) {
      /** Getter */
      if ( arg === undefined ) 
        return this[`_${property.name}`]; 
            
      /** Setter */
      this[`_${property.name}`] = property.setTransform(arg, property); 
      
      /** Return this object for set call chaining */
      return this; 
    };
  });
  
  if ( typeof obj.tableName == `string` && obj.tableName.match(/[a-z_]+/) ) {
    /** Create MySQL delete method on prototype */
    parent[obj.className].prototype.delete = async function (db) { 
      /** If the argument is a valid database, delete the record */
      if ( typeof db == `object` && db.constructor.name == `MySQLConnection` )
        await db.query(`DELETE FROM ${obj.tableName} WHERE id = ?`, [this.id()]);

      /** Otherwise throw TypeError */
      else
        throw new TypeError(`${this.constructor.name}.delete(${typeof db}): Invalid signature.`);

      /** Allow for call chaining */
      return this;
    };

    /** Create MySQL insert method on prototype */
    parent[obj.className].prototype.insert = async function (arg1) { 
      /** Provide option for inserting record from browser if developer implements ajax backend */
      if ( typeof window !== `undefined` && typeof arg1 == `string` ) {
        /** Attempt to parse the URL */
        const url = new URL(arg1);

        /** Attempt to retrieve a JSON response from the parsed URL */
        const result = await $.get({
          url: url.href,
          data: JSON.stringify(this),
          dataType: `json`
        });

        /** If successful, store id, if not, throw error */
        if ( result && result.insertId )
          this.id(result.insertId);
        else
          throw new Error(`${obj.className}.insert(): Unable to insert record, invalid response from remote host.`);
      }

      /** If the argument is a valid database, insert record into database and capture ID */
      else if ( typeof arg1 == `object` && arg1.constructor.name == `MySQLConnection` ) {
        /** Create array for storing values to insert */
        const params = [];

        /** Create helper method for recursively adding properties to params array */
        const propertyValues = (obj) => {
          /** If this object extends another, recursively add properties from the extended object */
          if ( obj.extendsConfig )
            propertyValues(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Ignore ID since we`ll get that from the insert, also ignore properties not stored */
            if ( property.name == `id` || !property.store )
              return;

            /** Add property to params array after performing the save transform */
            params.push(property.saveTransform(this[property.name](), property));
          });
        };

        /** Recursively add properties to params array */
        propertyValues(obj);

        /** Begin INSERT query */
        let query = `INSERT INTO ${obj.tableName} (`;

        /** Create helper method for recursively adding property names to query */
        const propertyNames = (obj) => {
          /** If this object extends another, recursively add property names from the extended object */
          if ( obj.extendsConfig )
            propertyNames(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Ignore ID since we`ll get that from the insert, also ignore properties not stored */
            if ( property.name == `id` || !property.store )
              return;

            /** Append property name to query */
            query += `${property.name}, `;
          });
        };

        /** Add property names to query */
        propertyNames(obj);

        /** Trim extra `, ` from property list */
        query = query.substr(0, query.length - 2);

        /** Continue query */
        query += `) VALUES (`;

        /** Create helper method for recursively adding property value placeholders to query */
        const propertyPlaceholders = (obj) => {
          /** If this object extends another, recursively add property placeholders from the extended object */
          if ( obj.extendsConfig )
            propertyPlaceholders(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Ignore ID since we`ll get that from the insert, also ignore properties not stored */
            if ( property.name == `id` || !property.store )
              return;

            /** Append placeholder to query */
            query += `?, `;
          });
        };

        /** Add property placeholders to query */
        propertyPlaceholders(obj);

        /** Trim extra `, ` from placeholder list */
        query = query.substr(0, query.length - 2);

        /** Finish query */
        query += `)`;
        
        /** Execute query to add record to database */
        const result = await arg1.query(query, params);

        /** Store the resulting insert ID */
        this.id(result.insertId);
      } 

      /** Otherwise throw TypeError */
      else {
        throw new TypeError(`${this.constructor.name}.insert(${typeof arg1}): Invalid signature.`);
      }

      /** Allow for call chaining */
      return this;
    };

    /** Create MySQL load method on prototype */
    parent[obj.className].prototype.load = async function (arg1, db) {        
      /** Provide option for loading record from browser if developer implements ajax backend */
      if ( typeof window !== `undefined` && typeof arg1 == `string` && arg1.match(/^http\:\/\//i) ) {
        /** Attempt to parse the URL */
        const url = new URL(arg1);

        /** Attempt to retrieve a JSON response from the parsed URL */
        const result = await $.get({
          url: url.href,
          dataType: `json`
        });

        /** If result is invalid, throw error */
        if ( !result )
          throw new Error(`${obj.className}.load(): Unable to load record, invalid response from remote host.`);

        /** Create helper method for recursively loading property values into object */
        const loadProperties = async (obj) => {
          /** If this object extends another, recursively add extended property values into objecct */
          if ( obj.extendsConfig )
            await loadProperties(obj.extendsConfig);

          /** Loop through each property */
          for ( let i = 0, i_max = obj.properties.length; i < i_max; i++ ) {
            /** Don't attempt to load properties that are not stored in the database */
            if ( !obj.properties[i].store )
              continue;
            
            /** Append property in object */
            if ( typeof arg1[obj.properties[i].name] !== `undefined` ) {
              if ( typeof db == 'object' && db.constructor.name == 'MySQLConnection' )
                this[obj.properties[i].name](await obj.properties[i].loadTransform(result[obj.properties[i].name], obj.properties[i], db));
              else
                this[obj.properties[i].name](await obj.properties[i].loadTransform(result[obj.properties[i].name], obj.properties[i]));
            }
          }
        };

        /** Store loaded record properties into object */
        await loadProperties(obj);
      }

      /** If the first argument is a valid database and the second is a number, load record from database by ID */
      else if ( ( typeof arg1 == `number` || typeof arg1 == `string` ) && typeof db == `object` && db.constructor.name == `MySQLConnection` ) {
        if ( typeof arg1 == `string` && typeof obj.otherSearchField !== `string` )
          throw new Error(`${obj.className}.load(): String argument is not a URL so loading from database, but no 'otherSearchField' configured.`);

        /** Begin SELECT query */
        let query = `SELECT `;

        /** Create helper method for recursively adding property names to query */
        const propertyNames = (obj) => {
          /** If this object extends another, recursively add property names from the extended object */
          if ( obj.extendsConfig )
            propertyNames(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Don't attempt to load properties that are not stored in the database */
            if ( !property.store )
              return;
            
            /** Append property name to query */
            query += `${property.name}, `;
          });
        };

        /** Add property names to query */
        propertyNames(obj);

        /** Trim extra `, ` from property list */
        query = query.substr(0, query.length - 2);

        /** Add from clause */
        query += ` FROM ${obj.tableName} `;

        /** Add where clause based on whether we're searching by `id` or `otherSearchField` */
        if ( typeof arg1 === `string` && typeof obj.otherSearchField === `string` )
          query += `WHERE ${obj.otherSearchField} = ?`;
        else
          query += `WHERE id = ?`;

        /** Execute query to load record properties from the database */
        const result = await db.query(query, [arg1]);

        /** If a record with that ID doesn`t exist, throw error */
        if ( !result[0] )
          return null;
                
        /** Create helper method for recursively loading property values into object */
        const loadProperties = async (obj) => {
          /** If this object extends another, recursively add extended property values into objecct */
          if ( obj.extendsConfig )
            await loadProperties(obj.extendsConfig);

          /** Loop through each property */
          for ( let i = 0, i_max = obj.properties.length; i < i_max; i++ ) {            
            /** Don't attempt to load properties that are not stored in the database */
            if ( !obj.properties[i].store )
              continue;

            /** Append property in object */
            if ( obj.properties[i].type != 'array' )
              this[obj.properties[i].name](await obj.properties[i].loadTransform(result[0][obj.properties[i].name], obj.properties[i], db));
            else
              this[obj.properties[i].name](await obj.properties[i].loadTransform(result[0][obj.properties[i].name], obj.properties[i], db));
          }
        };

        /** Store loaded record properties into object */
        await loadProperties(obj);
      } 

      /** If the first argument is a MySQL RowDataPacket, load from row data */
      else if ( typeof arg1 == `object` && ( arg1.constructor.name == `RowDataPacket` || arg1.constructor.name == `Object` ) ) {        
        /** Create helper method for recursively loading property values into object */
        const loadProperties = async (obj) => {
          /** If this object extends another, recursively add extended property values into objecct */
          if ( obj.extendsConfig )
            await loadProperties(obj.extendsConfig);

          /** Loop through each property */
          for ( let i = 0, i_max = obj.properties.length; i < i_max; i++ ) {
            /** Don't attempt to load properties that are not stored in the database */
            if ( !obj.properties[i].store )
              continue;
            
            /** Append property in object */
            if ( typeof arg1[obj.properties[i].name] !== `undefined` ) {              
              if ( typeof db == 'object' && db.constructor.name == 'MySQLConnection' )
                this[obj.properties[i].name](await obj.properties[i].loadTransform(arg1[obj.properties[i].name], obj.properties[i], db));
              else
                this[obj.properties[i].name](await obj.properties[i].loadTransform(arg1[obj.properties[i].name], obj.properties[i]));
            }
          }
        };

        /** Store loaded record properties into object */
        await loadProperties(obj);
      } 

      /** Otherwise throw TypeError */
      else {
        throw new TypeError(`${this.constructor.name}.load(${typeof arg1}, ${typeof db}): Invalid signature.`);
      }

      /** Allow for call chaining */
      return this;
    };

    /** Create MySQL update method on prototype */
    parent[obj.className].prototype.update = async function (arg1) { 
      /** Provide option for inserting record from browser if developer implements ajax backend */
      if ( typeof window !== `undefined` && typeof arg1 == `string` ) {
        /** Attempt to parse the URL */
        const url = new URL(arg1);

        /** Attempt to retrieve a JSON response from the parsed URL */
        const result = await $.get({
          url: url.href,
          data: JSON.stringify(this),
          dataType: `json`
        });

        /** If response is invalid, throw error */
        if ( !result )
          throw new Error(`${obj.className}.update(): Unable to update record, invalid response from remote host.`);
      }

      /** If the argument is a valid database, update database record */
      else if ( typeof arg1 == `object` && arg1.constructor.name == `MySQLConnection` ) {
        /** Create array for storing values to update */
        const params = [];

        /** Create helper method for recursively adding properties to params array */
        const propertyValues = (obj) => {
          /** If this object extends another, recursively add properties from the extended object */
          if ( obj.extendsConfig )
            propertyValues(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Ignore ID since we will use that to locate the record, and will never update it, also ignore properties not stored */
            if ( property.name == `id` || !property.store )
              return;

            /** Add property to params array after performing the save transform */
            params.push(property.saveTransform(this[property.name](), property));
          });
        };

        /** Recursively add properties to params array */
        propertyValues(obj);

        /** Add ID to params array at the end so we can locate the record to update */
        params.push(this.id());

        /** Begin UPDATE query */
        let query = `UPDATE ${obj.tableName} SET `;

        /** Create helper method for recursively adding property updates to query */
        const propertyUpdates = (obj) => {
          /** If this object extends another, recursively add properties from the extended object */
          if ( obj.extendsConfig )
            propertyUpdates(obj.extendsConfig);

          /** Loop through each property */
          obj.properties.forEach((property) => {
            /** Ignore ID since we will use that to locate the record, and will never update it, also ignore properties not stored */
            if ( property.name == `id` || !property.store )
              return;

            /** Append property update to query */
            query += `${property.name} = ?, `;
          });
        };

        /** Add property updates to query */
        propertyUpdates(obj);

        /** Trim extra `, ` from property list */
        query = query.substr(0, query.length - 2);

        /** Finish query */
        query += ` WHERE id = ?`;

        /** Execute query to update record in database */
        await arg1.query(query, params);
      } 

      /** Otherwise throw TypeError */
      else {
        throw new TypeError(`${this.constructor.name}.update(${typeof arg1}): Invalid signature.`);
      }

      /** Allow for call chaining */
      return this;
    };
  }
  
  /** 
   * Because we`re creating this object dynamically, we need to manually give it a name 
   * attribute so we can identify it by its type when we want to.
   */
  Object.defineProperty(parent[obj.className], `name`, { value: obj.className });
};

/** Re-export MySQLConnection */
module.exports.MySQLConnection = mysqlConnection.MySQLConnection;
