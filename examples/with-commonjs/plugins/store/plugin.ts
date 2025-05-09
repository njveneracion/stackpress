//stackpress
import type { Server } from 'stackpress/server';
//util
import connect from './connect';

export default function plugin(server: Server) {
  //on config, register the store
  server.on('config', async _ => {
    server.register('database', await connect());
  });
  //on listen, add populate event
  server.on('listen', async _ => {
    server.on('populate', () => import('./populate.js'));
  });
};