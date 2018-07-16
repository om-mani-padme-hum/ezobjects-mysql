const docket = require(`docket-parser`);

docket.title(`EZ Objects v4.0.0`);
docket.linkClass(`text-success`);
docket.parseFiles([`index.js`, `mysql-connection.js`]);
docket.generateDocs(`docs`);
