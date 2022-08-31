
import { FieldMetadata } from '../src/column-interfaces.js';
import { Remult, allEntities } from '../src/context.js';
import { SqlDatabase } from '../src/data-providers/sql-database.js';
import { getDbNameProvider } from '../src/filter/filter-consumer-bridge-to-sql-request.js';
import { EntityMetadata, isAutoIncrement } from '../src/remult3/index.js';
import { ValueConverters } from '../src/valueConverters.js';


export function postgresColumnSyntax(x: FieldMetadata, dbName: string) {
    let result = dbName;
    if (x.valueType == Number) {
        if (!x.valueConverter.fieldTypeInDb)
            result += " numeric" + (x.allowNull ? "" : " default 0 not null");

        else
            result += " " + x.valueConverter.fieldTypeInDb + (x.allowNull ? "" : " default 0 not null");
    }
    else if (x.valueType == Date) {
        if (!x.valueConverter.fieldTypeInDb)
            if (x.valueConverter == ValueConverters.DateOnly)
                result += " date";
            else
                result += " timestamp";
        else
            result += " " + x.valueConverter.fieldTypeInDb;
    }
    else if (x.valueType == Boolean)
        result += " boolean" + (x.allowNull ? "" : " default false not null");

    else if (x.valueConverter.fieldTypeInDb) {
        result += " " + x.valueConverter.fieldTypeInDb;
        if (!x.allowNull && x.valueConverter.fieldTypeInDb == 'integer') {
            result += " default 0 not null";
        }
    }
    else
        result += " varchar" + (x.allowNull ? "" : " default '' not null");
    return result;
}


export async function verifyStructureOfAllEntities(db: SqlDatabase, remult: Remult) {
    return await new PostgresSchemaBuilder(db).verifyStructureOfAllEntities(remult);
}

export class PostgresSchemaBuilder {
    async verifyStructureOfAllEntities(remult: Remult) {
        console.log("start verify structure");
        for (const entityClass of allEntities) {
            let entity = remult.repo(entityClass).metadata;
            let e = await getDbNameProvider(entity);
            try {
                if (!entity.options.sqlExpression) {
                    if ((await e.entityName).toLowerCase().indexOf('from ') < 0) {
                        await this.createIfNotExist(entity);
                        await this.verifyAllColumns(entity);
                    }
                }
            }
            catch (err) {
                console.log("failed verify structure of " + e.entityName + " ", err);
            }
        }
    }
    async createIfNotExist(entity: EntityMetadata): Promise<void> {
        var c = this.pool.createCommand();
        let e = await getDbNameProvider(entity);

        await c.execute("select 1 from information_Schema.tables where table_name=" + c.addParameterAndReturnSqlToken((e.entityName).toLowerCase()) + this.additionalWhere).then(async r => {

            if (r.rows.length == 0) {
                let result = '';
                for (const x of entity.fields) {
                    if (!e.isDbReadonly(x) || isAutoIncrement(x)) {
                        if (result.length != 0)
                            result += ',';
                        result += '\r\n  ';

                        if (isAutoIncrement( x))
                            result += e.nameOf(x) + ' serial';
                        else {
                            result += postgresColumnSyntax(x, e.nameOf(x));
                            if (x == entity.idMetadata.field)
                                result += ' primary key';
                        }
                    }
                }

                let sql = 'create table ' + e.entityName + ' (' + result + '\r\n)';
                //console.log(sql);
                await this.pool.execute(sql);
            }
        });
    }


    async addColumnIfNotExist<T extends EntityMetadata>(entity: T, c: ((e: T) => FieldMetadata)) {
        let e = await getDbNameProvider(entity);
        if (e.isDbReadonly(c(entity)))
            return;
        try {
            let cmd = this.pool.createCommand();

            const colName = e.nameOf(c(entity));
            if (
                (await cmd.execute(`select 1   
        FROM information_schema.columns 
        WHERE table_name=${cmd.addParameterAndReturnSqlToken((e.entityName).toLocaleLowerCase())} and column_name=${cmd.addParameterAndReturnSqlToken((colName).toLocaleLowerCase())}` + this.additionalWhere
                )).rows.length == 0) {
                let sql = `alter table ${e.entityName} add column ${postgresColumnSyntax(c(entity), colName)}`;
                //console.log(sql);
                await this.pool.execute(sql);
            }
        }
        catch (err) {
            console.log(err);
        }
    }
    async verifyAllColumns<T extends EntityMetadata>(entity: T) {
        try {
            let cmd = this.pool.createCommand();
            let e = await getDbNameProvider(entity);

            let cols = (await cmd.execute(`select column_name   
        FROM information_schema.columns 
        WHERE table_name=${cmd.addParameterAndReturnSqlToken((e.entityName).toLocaleLowerCase())} ` + this.additionalWhere
            )).rows.map(x => x.column_name);
            for (const col of entity.fields) {
                if (!e.isDbReadonly(col))
                    if (!cols.includes(e.nameOf(col).toLocaleLowerCase())) {
                        let sql = `alter table ${e.entityName} add column ${postgresColumnSyntax(col, e.nameOf(col))}`;
                        //console.log(sql);
                        await this.pool.execute(sql);
                    }
            }

        }
        catch (err) {
            console.log(err);
        }
    }
    additionalWhere = '';
    constructor(private pool: SqlDatabase, schema?: string) {
        if (schema) {
            this.additionalWhere = ' and table_schema=\'' + schema + '\'';
        }
    }
}

