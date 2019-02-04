const docket = require(`docket-parser`);

docket.title(`EZ Objects v6.1.9`);
docket.linkClass(`text-success`);
docket.parseFiles([`index.js`, `mysql-connection.js`]);
docket.generateDocs(`docs`);
