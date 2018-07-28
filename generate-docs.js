const docket = require(`docket-parser`);

docket.title(`EZ Objects v6.0.5`);
docket.linkClass(`text-success`);
docket.parseFiles([`index.js`, `mysql-connection.js`]);
docket.generateDocs(`docs`);
