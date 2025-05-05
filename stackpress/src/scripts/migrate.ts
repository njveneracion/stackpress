//node
import path from 'node:path';
//stackpress
import type { QueryObject } from '@stackpress/inquire/types';
import type Engine from '@stackpress/inquire/Engine';
import type Server from '@stackpress/ingest/Server';
//schema
import Revisions from '../client/Revisions.js';
//sql
import type { DatabaseConfig } from '../sql/types.js'; 
import { sequence } from '../sql/helpers.js';
//plugins
import create from '../sql/schema.js';

export default async function migrate(
  server: Server<any, any, any>, 
  database: Engine
) {
  //get config
  const root = server.config.path<string>('client.revisions');
  const { migrations } = server.config<DatabaseConfig>('database') || {}; 
  //if there is not a migrations or revisions folder
  if (!migrations || !root) {
    return;
  }
  //collect all the revisions
  const revisions = new Revisions(root, server.loader);
  //if there are no revisions
  if (!await revisions.last()) {
    return;
  }
  const fs = server.loader.fs;
  const first = await revisions.first();
  if (first) {
    //this is where we are going to store all the queries
    const queries: QueryObject[] = [];
    //get models
    const models = Array.from(first.registry.model.values());
    //there's an order to creating and dropping tables
    const order = sequence(models);
    //add drop queries
    for (const model of order) {
      queries.push(database.dialect.drop(model.snake));
    }
    //add create queries
    for (const model of order.reverse()) {
      const exists = models.find(map => map.name === model.name);
      if (exists) {
        const schema = create(exists);
        schema.engine = database;
        queries.push(...schema.query());
      }
    }
    if (queries.length) {
      if (!await fs.exists(migrations)) {
        await fs.mkdir(migrations, { recursive: true });
      }
      //add migration file
      await fs.writeFile(
        path.join(migrations, `${first.date.getTime()}.sql`),
        queries.map(query => query.query).join(';\n')
      );
    }
  }

  for (let i = 1; i < revisions.size(); i++) {
    const from = await revisions.index(i - 1);
    const to = await revisions.index(i);
    if (!from || !to) break;
    //create a registry from the history
    const previous = Array.from(from.registry.model.values()).map(
      model => create(model)
    );
    //create a registry from the new generated schema
    const current = Array.from(to.registry.model.values()).map(
      model => create(model)
    );
    //this is where we are going to store all the queries
    const queries: QueryObject[] = [];
    //loop through all 'current' the models
    for (const schema of current) {
      const name = schema.build().table;
      const before = previous.find(from => from.build().table === name);
      //if the schema wasn't there before
      if (!before) {
        //set the engine to determine the dialect
        schema.engine = database;
        //add to the queries
        queries.push(...schema.query());
        continue;
      }
      //the model was there before...
      try {
        //this could error if there were no differences found.
        //push all the alter statements
        queries.push(...database.diff(before, schema).query());
      } catch(e) {}
    }
    //loop through all 'previous' the models
    for (const schema of previous) {
      const name = schema.build().table;
      const after = current.find(to => to.build().table === name);
      //if the model is not there now
      if (!after) {
        //we need to drop this table
        queries.push(database.dialect.drop(name));
        continue;
      }
    }
    //if there are queries to be made...
    if (queries.length) {
      if (!await fs.exists(migrations)) {
        await fs.mkdir(migrations, { recursive: true });
      }
      //add migration file
      await fs.writeFile(
        path.join(migrations, `${to.date.getTime()}.sql`),
        queries.map(query => query.query).join(';\n')
      );
    }
  }
};