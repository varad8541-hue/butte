// src/zenith.js
require('dotenv').config({ quiet: true });
const { ClusterManager } = require('discord-hybrid-sharding');
const path = require('path');
const config = require('./config/config.json');
const colors = require('colors');

const manager = new ClusterManager(
  path.join(__dirname, 'index.js'),
  {
    totalShards: 'auto',
    shardsPerClusters: 2,
    totalClusters: 'auto',
    mode: 'process',
    token: process.env.TOKEN,
    restarts: {
      max: 5,
      interval: 60000 * 60, // 1 hour
    },
  }
);

manager.on('clusterCreate', cluster => {
  console.log(`[CLUSTER]`.cyan + ` Cluster ${cluster.id} launched successfully`.white);
});

manager.on('debug', info => console.log(`[DEBUG]`.gray + ` ${info}`));

console.log(`[ZENITH]`.magenta + ` Starting the bot system...`.white);
manager.spawn({ timeout: -1 });
