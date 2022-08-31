
import { EntityDataProvider, EntityDataProviderFindOptions, DataProvider } from "../data-interfaces.js";
import { SqlCommand, SqlImplementation, SqlResult } from "../sql-command.js";
import { CompoundIdField } from "../column.js";
import { CustomSqlFilterBuilderFunction, CustomSqlFilterObject, dbNameProvider, FilterConsumerBridgeToSqlRequest, getDbNameProvider } from "../filter/filter-consumer-bridge-to-sql-request.js";
import { customDatabaseFilterToken, Filter } from '../filter/filter-interfaces.js';
import { Sort, SortSegment } from '../sort.js';
import { EntityMetadata, EntityFilter } from "../remult3/index.js";
import { FieldMetadata } from "../column-interfaces.js";

// @dynamic
export class SqlDatabase implements DataProvider {
  createCommand(): SqlCommand {
    return new LogSQLCommand(this.sql.createCommand(), SqlDatabase.LogToConsole);
  }
  async execute(sql: string) {
    return await this.createCommand().execute(sql);
  }
  getEntityDataProvider(entity: EntityMetadata): EntityDataProvider {

    return new ActualSQLServerDataProvider(entity, this, async (dbName) => {

      if (this.createdEntities.indexOf(dbName.entityName) < 0) {
        this.createdEntities.push(dbName.entityName);
        await this.sql.entityIsUsedForTheFirstTime(entity);
      }
    }, this.sql);
  }
  transaction(action: (dataProvider: DataProvider) => Promise<void>): Promise<void> {
    return this.sql.transaction(async x => {
      let completed = false;
      try {
        await action(new SqlDatabase({
          createCommand: () => {
            let c = x.createCommand();
            return {
              addParameterAndReturnSqlToken: x => c.addParameterAndReturnSqlToken(x),
              execute: async (sql) => {
                if (completed)
                  throw "can't run a command after the transaction was completed";
                return c.execute(sql)
              }
            };
          },
          getLimitSqlSyntax: this.sql.getLimitSqlSyntax,
          entityIsUsedForTheFirstTime: y => x.entityIsUsedForTheFirstTime(y),
          transaction: z => x.transaction(z),
        }));
      }
      finally {
        completed = true;
      }
    });
  }
  static customFilter(build: CustomSqlFilterBuilderFunction): EntityFilter<any> {
    return {
      [customDatabaseFilterToken]: {
        buildSql: build
      }
    }

  }
  public static LogToConsole = false;
  public static durationThreshold = 0;
  constructor(private sql: SqlImplementation) {

  }
  private createdEntities: string[] = [];
}




class LogSQLCommand implements SqlCommand {
  constructor(private origin: SqlCommand, private allQueries: boolean) {

  }

  args: any = {};
  addParameterAndReturnSqlToken(val: any): string {
    let r = this.origin.addParameterAndReturnSqlToken(val);
    this.args[r] = val;
    return r;
  }
  async execute(sql: string): Promise<SqlResult> {

    try {
      let start = new Date();
      let r = await this.origin.execute(sql);
      if (this.allQueries) {
        var d = new Date().valueOf() - start.valueOf();
        if (d > SqlDatabase.durationThreshold) {
          console.log({ query: sql, arguments: this.args, duration: d / 1000 });
        }
      }
      return r;
    }
    catch (err) {
      console.error({ error: err, query: sql, arguments: this.args });
      throw err;
    }
  }
}

class ActualSQLServerDataProvider implements EntityDataProvider {
  public static LogToConsole = false;
  constructor(private entity: EntityMetadata, private sql: SqlDatabase, private iAmUsed: (e: dbNameProvider) => Promise<void>, private strategy: SqlImplementation) {


  }
  async init() {
    let dbNameProvider = await getDbNameProvider(this.entity);
    await this.iAmUsed(dbNameProvider);
    return dbNameProvider;
  }



  async count(where: Filter): Promise<number> {
    let e = await this.init();

    let select = 'select count(*) count from ' + e.entityName;
    let r = this.sql.createCommand();
    if (where) {
      let wc = new FilterConsumerBridgeToSqlRequest(r, e);
      where.__applyToConsumer(wc);
      select += await wc.resolveWhere();
    }

    return r.execute(select).then(r => {
      return Number(r.rows[0].count);
    });

  }
  async find(options?: EntityDataProviderFindOptions): Promise<any[]> {
    let e = await this.init();

    let { colKeys, select } = this.buildSelect(e);
    select = 'select ' + select;

    select += '\n from ' + e.entityName;
    let r = this.sql.createCommand();
    if (options) {
      if (options.where) {
        let where = new FilterConsumerBridgeToSqlRequest(r, e);
        options.where.__applyToConsumer(where);
        select += await where.resolveWhere();
      }
      if (options.limit) {
        options.orderBy = Sort.createUniqueSort(this.entity, options.orderBy);
      }
      if (!options.orderBy){
        options.orderBy = Sort.createUniqueSort(this.entity,new Sort());
      }
      if (options.orderBy) {
        let first = true;
        let segs: SortSegment[] = [];
        for (const s of options.orderBy.Segments) {
          if (s.field instanceof CompoundIdField) {
            segs.push(...s.field.fields.map(c => ({ field: c, isDescending: s.isDescending })))
          }
          else segs.push(s);
        }
        for (const c of segs) {
          if (first) {
            select += ' Order By ';
            first = false;
          }
          else
            select += ', ';

          select += e.nameOf(c.field);
          if (c.isDescending)
            select += ' desc';
        }
      }

      if (options.limit) {

        let page = 1;
        if (options.page)
          page = options.page;
        if (page < 1)
          page = 1;
        select += ' ' + this.strategy.getLimitSqlSyntax(options.limit, (page - 1) * options.limit);
      }
    }

    return r.execute(select).then(r => {
      return r.rows.map(y => {
        return this.buildResultRow(colKeys, y, r);
      });
    });
  }

  private buildResultRow(colKeys: FieldMetadata<any>[], y: any, r: SqlResult) {
    let result: any = {};
    for (let index = 0; index < colKeys.length; index++) {
      const col = colKeys[index];
      try {
        result[col.key] = col.valueConverter.fromDb(y[r.getColumnKeyInResultForIndexInSelect(index)]);
      }
      catch (err) {
        throw new Error("Failed to load from db:" + col.key + "\r\n" + err);
      }
    }
    return result;
  }

  private buildSelect(e: dbNameProvider) {
    let select = '';
    let colKeys: FieldMetadata[] = [];
    for (const x of this.entity.fields) {
      if (x.isServerExpression) {
      }
      else {
        if (colKeys.length > 0)
          select += ', ';
        select += e.nameOf(x);
        colKeys.push(x);
      }
    }
    return { colKeys, select };
  }

  async update(id: any, data: any): Promise<any> {
    let e = await this.init();
    let r = this.sql.createCommand();
    let f = new FilterConsumerBridgeToSqlRequest(r, e);
    Filter.fromEntityFilter(this.entity, this.entity.idMetadata.getIdFilter(id)).__applyToConsumer(f);

    let statement = 'update ' + e.entityName + ' set ';
    let added = false;


    for (const x of this.entity.fields) {
      if (x instanceof CompoundIdField) {

      } if (e.isDbReadonly(x)) { }
      else if (data[x.key] !== undefined) {
        let v = x.valueConverter.toDb(data[x.key]);
        if (v !== undefined) {
          if (!added)
            added = true;
          else
            statement += ', ';

          statement += e.nameOf(x) + ' = ' + r.addParameterAndReturnSqlToken(v);
        }
      }
    }

    statement += await f.resolveWhere();
    let { colKeys, select } = this.buildSelect(e);
    statement += ' returning ' + select;

    return r.execute(statement).then(sqlResult => {
      return this.buildResultRow(colKeys, sqlResult.rows[0], sqlResult);
    });


  }
  async delete(id: any): Promise<void> {
    let e = await this.init();
    let r = this.sql.createCommand();
    let f = new FilterConsumerBridgeToSqlRequest(r, e);
    Filter.fromEntityFilter(this.entity, this.entity.idMetadata.getIdFilter(id)).__applyToConsumer(f);
    let statement = 'delete from ' + e.entityName;
    statement += await f.resolveWhere();
    return r.execute(statement).then(() => { });
  }
  async insert(data: any): Promise<any> {
    let e = await this.init();

    let r = this.sql.createCommand();
    let cols = '';
    let vals = '';
    let added = false;

    for (const x of this.entity.fields) {

      if (e.isDbReadonly(x)) { }

      else {
        let v = x.valueConverter.toDb(data[x.key]);
        if (v != undefined) {
          if (!added)
            added = true;
          else {
            cols += ', ';
            vals += ', ';
          }

          cols += e.nameOf(x);
          vals += r.addParameterAndReturnSqlToken(v);
        }
      }
    }


    let statement = `insert into ${e.entityName} (${cols}) values (${vals})`;

    let { colKeys, select } = this.buildSelect(e);
    statement += ' returning ' + select;
    return await r.execute(statement).then(sql => this.buildResultRow(colKeys, sql.rows[0], sql));

  }
}


