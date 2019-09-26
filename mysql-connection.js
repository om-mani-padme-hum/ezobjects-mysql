/** Require external modules */
const mysql = require(`mysql`);

/**
 * @class ezobjects.MySQLConnection
 * @author Rich Lowe
 * @copyright 2018 Rich Lowe
 * @description Class for establishing and querying MySQL connections.
 */
class MySQLConnection {
  /**
   * @signature new MySQLConnection([data])
   * @param config Object
   * @returns MySQLConnection
   * @description Returns a new [MySQLConnection] instance and initializes using `config`, if provided, otherwise 
   * it initializes to defaults and will require a config to be set later.
   */
  constructor(config) {
    this.config(config || null);
    this.conn(null);
    this.inTransaction(false);
  }
  
  /**
   * @signature abort()
   * @returns Promise
   * @description Abort the current SQL transaction, returning a [Promise] that resolves when finished.
   */
  abort() {
    return new Promise((resolve) => {
      /** Execute query and return result */
      this.conn().rollback(() => {
        /** Set the in transaction boolean to false so we can continue with normal queries */
        this.inTransaction(false);

        resolve();
      });
    });
  }
  
  /**
   * @signature begin()
   * @returns Promise
   * @description Begins an SQL transaction, returning a [Promise] that resolves when finished or rejects
   * on error.
   */
  begin() {
    return new Promise(async (resolve, reject) => {
      if ( !this.conn() )
        await this.connect();
      
      /** Execute query and return result */
      this.conn().beginTransaction((err) => {
        /** Handle errors */
        if ( err ) {
          reject(err);
        } else {
          /** Set the in transaction boolean to true so we can rollback on error */
          this.inTransaction(true);
          
          resolve();
        }
      });
    });
  }
  
  /**
   * @signature commit()
   * @returns Promise
   * @description Commits an SQL transaction, returning a [Promise] that resolves when finished or rejects
   * on error.  Rejected commits have their transactions automatically rolled back.
   */
  commit() {
    return new Promise((resolve, reject) => {
      /** Execute query and return result */
      this.conn().commit((err) => {
        /** Handle errors */
        if ( err ) {
          this.conn().rollback(() => {
            /** Set the in transaction boolean to false so we can continue with normal queries */
            this.inTransaction(false);
            
            reject(err);
          });
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * @signature config()
   * @returns Object
   * @description Returns the configuration settings for this database connection.
   *
   * @signature config(settings)
   * @param settings Object
   * @throws TypeError if `settings` is not a valid [Object]
   * @returns this
   * @description Sets the configuration settings for this database connection.
   */
  config(arg1) {
    /** Getter */
    if ( arg1 === undefined )
      return this._config;
    
    /** Setter */
    else if ( typeof arg1 == `object` )
      this._config = arg1; 
    
    /** Handle errors */
    else
      throw new TypeError(`${this.constructor.name}.config(${typeof arg1}): Invalid signature.`);
    
    /** Allow for call chaining */
    return this;
  }
  
  /**
   * @signature conn()
   * @returns mysql.Connection
   * @description Returns the database connection object.
   *
   * @signature conn(connection)
   * @param connection mysql.Connection
   * @throws TypeError if `connection` is not a valid [mysql.Connection]
   * @returns this
   * @description Sets the database connection object.
   */
  conn(arg1) {
    /** Getter */
    if ( arg1 === undefined )
      return this._conn;
    
    /** Setter */
    else if ( arg1 === null || ( typeof arg1 == `object` && arg1.constructor.name == `Connection` ) )
      this._conn = arg1; 
    
    /** Handle errors */
    else
      throw new TypeError(`${this.constructor.name}.conn(${typeof arg1}): Invalid signature.`);
    
    /** Allow for call chaining */
    return this;
  }
  
  /**
   * @signature connect()
   * @returns Promise
   * @description Connects to the MySQL database, returning a [Promise] that resolves when finished or rejects on error.
   */
  connect() {
    return new Promise((resolve, reject) => {
      /** Verify configuration exists */
      if ( !this.config() )
        reject(`MySQL configuration not set, aborting connection.`);

      /** Set MySQL connection info */
      this.conn(mysql.createConnection(this.config()));

      /** If there's an error that's not part of a callback, just close the connection */
      this.conn().on(`error`, (err) => {
        this.conn(null);
      });
      
      /** Attempt to connect to the database */
      this.conn().connect((err) => {
        /** Handle errors */
        if ( err )
          reject(err);
        else
          resolve();
      });
    });
  }
  
  /**
   * @signature inTransaction()
   * @returns boolean
   * @description Returns a boolean indicating whether the database connection is in the middle of a transaction.
   *
   * @signature inTransaction(flag)
   * @param flag boolean
   * @throws TypeError if `flag` is not a valid [boolean]
   * @returns this
   * @description Sets a boolean indicating whether the database connection is in the middle of a transaction.
   */
  inTransaction(arg1) {
    /** Getter */
    if ( arg1 === undefined )
      return this._inTransaction;
    
    /** Setter */
    else if ( typeof arg1 == `boolean` )
      this._inTransaction = arg1; 
    
    /** Handle errors */
    else
      throw new TypeError(`${this.constructor.name}.inTransaction(${typeof arg1}): Invalid signature.`);
    
    /** Allow for call chaining */
    return this;
  }
  
  /**
   * @signature query(query, params)
   * @param query string Valid MySQL query
   * @param params Array Ordered array with values matching the parameters marked by `?` in the `query`
   * @returns Promise
   * @description Queries the MySQL database, returning a [Promise] that resolves when finished or rejects on error.  If the database has not
   * yet established a connection, it is automatically done prior to query execution.
   */
  query(query, params) {
    return new Promise(async (resolve, reject) => {
      if ( !this.conn() )
        await this.connect();
      
      /** Execute query and return result */
      try {
        const result = await this.execute(query, params);
        
        resolve(result);
      } catch ( err ) {
        reject(err);
      }
    });
  }
  
  /**
   * @signature execute(query, params)
   * @param query string Valid MySQL query
   * @param params Array Ordered array with values matching the parameters marked by `?` int he `query`
   * @returns Promise
   * @description Queries the MySQL database, returning a [Promise] that resolves when finished or rejects on error.  Rejected query executions
   * in the middle of transactions have their transactions automatically rolled back.
   */
  execute(query, params) {
    return new Promise((resolve, reject) => {
      /** Query the MySQL connection */
      this.conn().query(query, params, (err, result) => {
        /** If error, print to console */
        if ( err ) {
          if ( this.inTransaction() ) {
            this.conn().rollback(() => {
              /** Set the in transaction boolean to false so we can continue with normal queries */
              this.inTransaction(false);
              
              reject(err);
            });
          } else {
            reject(err);
          }
        } else {
          /** Return result */
          resolve(result);
        }
      });
    });
  }
  
  /**
   * @signature close()
   * @returns Promise
   * @description Asynchronously closes the database connection, returning a [Promise] that resolves whether
   * the operation completed with an error or not.  That's because the only error usually is that the database
   * is already closed and we don't want to have to add a try/catch block for that.
   */
  close() {
    return new Promise((resolve) => {
      if ( this.conn() ) {
        /** Attempt to close the connection */
        this.conn().end((err) => {
          this.conn(null);
          
          resolve(err);
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports.MySQLConnection = MySQLConnection;
