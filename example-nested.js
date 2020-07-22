const ezobjects = require(`./index`);
const fs = require(`fs`);
const express = require(`express`);
const models = require(`./example-nested-models`);
const mysql = require(`mysql-await`);

const app = express();

const db = mysql.createConnection(JSON.parse(fs.readFileSync(`mysql-config.json`)));

app.get(`/workers/load/:id`, async (req, res, next) => {
  res.setHeader(`Access-Control-Allow-Origin`, `*`);

  try {
    const worker = await (new models.Worker()).load(req.params.id.match(/^[0-9]+$/) ? parseInt(req.params.id) : req.params.id, db);

    res.send(JSON.stringify(worker));
  } catch ( err ) {
    res.send(JSON.stringify({ error: err.message }));
  }
});

app.get(`/managers/load/:id`, async (req, res, next) => {
  res.setHeader(`Access-Control-Allow-Origin`, `*`);
  
  try {
    const manager = await (new models.Manager()).load(req.params.id.match(/^[0-9]+$/) ? parseInt(req.params.id) : req.params.id, db);

    manager._workers = manager.workers().map(x => `${x.constructor.name},${x.id()}`).join(`|`);

    res.send(JSON.stringify(manager));
  } catch ( err ) {
    res.send(JSON.stringify({ error: err.message }));
  }
});

app.listen(4000, async () => {
  await ezobjects.createTable(models.configWorker, db);
  await ezobjects.createTable(models.configManager, db);
  
  const worker1 = new models.Worker({
    name: `Rich`
  });
  
  const worker2 = new models.Worker({
    name: `Dan`,
  });
  
  const manager = new models.Manager({
    name: `Bob`,
    workers: [worker1, worker2]
  });
  
  await worker1.insert(db);
  await worker2.insert(db);
  await manager.insert(db);
  
  const manager2 = new models.Manager({
    _name: `Kate`,
    _workers: [
      { _constructorName: `Worker`, _name: `Chris` },
      { _constructorName: `Worker`, _name: `Lisa` }
    ]
  });
  
  console.log(manager2);
  
  db.end();
});
