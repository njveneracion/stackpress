//stackpress
import type { UnknownNest, StatusResponse } from '@stackpress/lib/types';
import type Engine from '@stackpress/inquire/Engine';
import Nest from '@stackpress/lib/Nest';
//schema
import type Model from '../../schema/spec/Model.js';
//sql
import type { SearchParams, SearchJoinMap } from '../types.js';
import { 
  toSqlString,
  toSqlFloat,
  toSqlInteger,
  toSqlBoolean,
  toSqlDate,
  toResponse,
  toErrorResponse,
  getColumns,
  getColumnInfo,
  stringable,
  floatable,
  dateable,
  boolable,
  intable
} from '../helpers.js';

/**
 * Searches the database table
 */
export default async function search<M extends UnknownNest = UnknownNest>(
  model: Model, 
  engine: Engine,
  query: SearchParams = {},
  seed?: string
): Promise<StatusResponse<M[]>> {
  //extract params
  let {
    q,
    columns = [ '*' ],
    filter = {},
    span = {},
    sort = {},
    skip = 0,
    take = 50,
    total: useTotal = true
  } = query;
  //valid columns: 
  // - createdAt
  // - user.emailAddress
  // - user.address.streetName
  // - user.address.*
  // - user.*
  // - *
  //reference: user User @relation({ local "userId" foreign "id" })
  columns = columns.map(column => getColumns(column, model)).flat();
  //collect info for each column
  //ex. group.owner.address.streetName
  // - name: group.owner.address.streetName
  // - table: group__owner__address
  // - column: street_name
  // - alias: group__owner__address__street_name
  // - joins: 
  //   - group as group ON (product.group_id = group.id)
  //   - user as group__owner ON (group.owner_id = group__owner.id)
  //   - address as group__owner__address ON (group__owner.address_id = group__owner__address.id)
  
  const info = columns
    .map(column => getColumnInfo(column, model))
    .filter(column => column.path.length > 0);
  //make a selectors map
  const selectors = info.map(selector => {
    const q = engine.dialect.q;
    const column = selector.table.length > 0
      ? `${q}${selector.table}${q}.${q}${selector.column}${q}`
      : `${q}${model.snake}${q}.${q}${selector.column}${q}`;

    //address.street_name AS user__address__street_name
    return `${column} AS ${q}${selector.alias}${q}`;
  })

  //finally, make the select builder
  const select = engine.select<M>(selectors).from(model.snake);
  //also make the count builder
  const count = engine
    .select<{ total: number }>('COUNT(*) as total')
    .from(model.snake);
  //make a joins map
  const joins: SearchJoinMap = {};
  info.forEach(selector => Object.assign(joins, selector.joins));
  Object.values(joins).forEach(({ table, from, to, alias }) => {
    const q = engine.dialect.q;
    select.join(
      'inner', 
      table, 
      from.replaceAll('.', `${q}.${q}`), 
      to.replaceAll('.', `${q}.${q}`),
      alias
    );
    count.join(
      'inner', 
      table, 
      from.replaceAll('.', `${q}.${q}`), 
      to.replaceAll('.', `${q}.${q}`),
      alias
    );
  });
  //if skip
  if (skip) {
    select.offset(skip);
  }
  //if take
  if (take) {
    select.limit(take);
  }
  //searchable
  if (q && model.searchables.length > 0) {
    select.where(
      model.searchables.map(
        column => `${column.snake} ILIKE ?`
      ).join(' OR '), 
      model.searchables.map(_ => `%${q}%`)
    );
    count.where(
      model.searchables.map(
        column => `${column.snake} ILIKE ?`
      ).join(' OR '), 
      model.searchables.map(_ => `%${q}%`)
    );
  }

  //default active value
  if (model.active) {
    if(typeof filter[model.active.name] === 'undefined') {
      filter[model.active.name] = true;
    } else if (filter[model.active.name] == -1) {
      delete filter[model.active.name];
    }
  }
  //filters
  Object.entries(filter).forEach(([ key, value ]) => {
    const info = getColumnInfo(key, model).last;
    if (!info) return;
    const q = engine.dialect.q;
    const selector = `${q}${info.model.snake}${q}.${q}${info.column.snake}${q}`;
    value = info.column.serialize(value, undefined, seed) as string|number|boolean;
    const serialized = stringable.includes(info.column.type)
      ? toSqlString(value)
      : floatable.includes(info.column.type)
      ? toSqlFloat(value)
      : intable.includes(info.column.type)
      ? toSqlInteger(value)
      : boolable.includes(info.column.type)
      ? toSqlBoolean(value)
      : dateable.includes(info.column.type)
      ? toSqlDate(value)?.toISOString()
      : String(value);
    if (typeof serialized !== 'undefined' && serialized !== '') {
      select.where(`${selector} = ?`, [ serialized ]);
      count.where(`${selector} = ?`, [ serialized ]);
    }
  });
  //spans
  Object.entries(span).forEach(([ key, values ]) => {
    const info = getColumnInfo(key, model).last;
    if (!info) return;
    const q = engine.dialect.q;
    const selector = `${q}${info.model.snake}${q}.${q}${info.column.snake}${q}`;
    if (typeof values[0] !== 'undefined'
      && values[0] !== null
      && values[0] !== ''
    ) {
      const value = info.column.unserialize(values[0], undefined, seed);
      const serialized = stringable.includes(info.column.type)
        ? toSqlString(value)
        : floatable.includes(info.column.type)
        ? toSqlFloat(value)
        : intable.includes(info.column.type)
        ? toSqlInteger(value)
        : boolable.includes(info.column.type)
        ? toSqlBoolean(value)
        : dateable.includes(info.column.type)
        ? toSqlDate(value)?.toISOString()
        : String(value);
      if (typeof serialized !== 'undefined' && serialized !== '') {
        select.where(`${selector} >= ?`, [ serialized ]);
        count.where(`${selector} >= ?`, [ serialized ]);
      }
    }
    if (typeof values[1] !== 'undefined'
      && values[1] !== null
      && values[1] !== ''
    ) {
      const value = info.column.unserialize(values[1], undefined, seed);
      const serialized = stringable.includes(info.column.type)
        ? toSqlString(value)
        : floatable.includes(info.column.type)
        ? toSqlFloat(value)
        : intable.includes(info.column.type)
        ? toSqlInteger(value)
        : boolable.includes(info.column.type)
        ? toSqlBoolean(value)
        : dateable.includes(info.column.type)
        ? toSqlDate(value)?.toISOString()
        : String(value);
      if (typeof serialized !== 'undefined') {
        select.where(`${selector} <= ?`, [ serialized ]);
        count.where(`${selector} <= ?`, [ serialized ]);
      }
    }
  });
  //sort
  Object.entries(sort).forEach(([ key, value ]) => {
    const direction = typeof value === 'string' ? value : '';
    if (direction.toLowerCase() !== 'asc' 
      && direction.toLowerCase() !== 'desc'
    ) {
      return;
    }
    const info = getColumnInfo(key, model).last;
    if (!info) return;
    const q = engine.dialect.q;
    //NOTE: inquire already adds the quotes around the column name
    const selector = `${info.model.snake}${q}.${q}${info.column.snake}`;
    select.order(selector, direction.toUpperCase() as 'ASC' | 'DESC');
  });

  try {
    const results = await select;
    const total = useTotal ? await count : [ { total: 0 } ];
    const rows: M[] = [];
    results.forEach(row => {
      const nest = new Nest();
      //ex. created_at: "2021-01-01T00:00:00.000Z"
      //ex. user__email_address: "john@doe.com"
      //ex. user__address__street_name: "123 Main St"
      Object.entries(row).forEach(([ alias, value ]) => {
        const selector = info.find(selector => selector.alias === alias);
        if (!selector) {
          return nest.withPath.set(
            alias.trim()
              //user__address__street_name -> user.address.street_name
              .replaceAll('__', '.')
              //user.address.street_name -> user.address.streetName
              .replace(
                /([a-z])_([a-z0-9])/ig, 
                (_, a, b) => a + b.toUpperCase()
              ),
            value
          );
        }
        nest.withPath.set(
          selector.name, 
          selector.last.column.unserialize(value, undefined, seed)
        );
      });
      rows.push(nest.get<M>());
    });
    //NOTE: In databases like CRDB the total is returned as a string
    return toResponse(
      rows, 
      Number(total[0].total) || undefined
    ) as StatusResponse<M[]>;
  } catch (e) {
    return toErrorResponse(e as Error) as StatusResponse<M[]>;
  }
};