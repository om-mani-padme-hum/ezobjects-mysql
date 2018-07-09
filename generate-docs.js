const docket = require(`docket-parser`);

docket.title(`EZ Objects v3.0.2`);
docket.linkClass(`text-success`);
docket.parseFiles([`index.js`, `mysql-connection.js`]);
docket.generateDocs(`docs`);
