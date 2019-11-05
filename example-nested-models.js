const ezobjects = require(`./index`);

const configWorker = {
  className: `Worker`,
  tableName: `example_workers`,
  url: `http://localhost:4000/workers/load/`,
  properties: [
    { name: `id`, type: `int` },
    { name: `name`, type: `varchar`, length: 32 }
  ]
};

const Worker = ezobjects.createClass(configWorker);

const configManager = {
  className: `Manager`,
  tableName: `example_managers`,
  extends: Worker,
  extendsConfig: configWorker,
  url: `http://localhost:4000/managers/load/`,
  properties: [
    { name: `workers`, type: `array`, arrayOf: { instanceOf: `Worker` } }
  ]
};

const Manager = ezobjects.createClass(configManager);

module.exports.configManager = configManager;
module.exports.configWorker = configWorker;
module.exports.Manager = Manager;
module.exports.Worker = Worker;
