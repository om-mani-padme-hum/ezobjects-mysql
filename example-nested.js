const ezobjects = require('./index');
const fs = require('fs');
const express = require('express');
const models = require('./example-nested-models');

const app = express();

const db = new ezobjects.MySQLConnection(JSON.parse(fs.readFileSync('mysql-config.json')));

app.get('/workers/load/:id', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const worker = await (new models.Worker()).load(req.params.id.match(/^[0-9]+$/) ? parseInt(req.params.id) : req.params.id, db);

    res.send(JSON.stringify(worker));
  } catch ( err ) {
    res.send(JSON.stringify({ error: err.message }));
  }
});

app.get('/managers/load/:id', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const manager = await (new models.Manager()).load(req.params.id.match(/^[0-9]+$/) ? parseInt(req.params.id) : req.params.id, db);

    console.log(manager);
    res.send(JSON.stringify(manager));
  } catch ( err ) {
    res.send(JSON.stringify({ error: err.message }));
  }
});

app.listen(4000);

(async () => {
  await ezobjects.createTable(models.configWorker, db);
  await ezobjects.createTable(models.configManager, db);
  
  const worker1 = new models.Worker({
    name: 'Rich'
  });
  
  const worker2 = new models.Worker({
    name: 'Dan',
  });
  
  const manager = new models.Manager({
    name: 'Bob',
    workers: [worker1, worker2]
  });
  
  await worker1.insert(db);
  await worker2.insert(db);
  await manager.insert(db);
})();
