import { Knex } from 'knex';
import { Filter, FilterConsumer } from "../src/filter/filter-interfaces.js";
import { dbNameProvider } from "../src/filter/filter-consumer-bridge-to-sql-request.js";
import { Remult } from "../src/context.js";
import { EntityFilter, EntityMetadata } from "../src/remult3/index.js";
import { DataProvider, EntityDataProvider } from '../src/data-interfaces.js';
import { FieldMetadata } from '../src/column-interfaces.js';
export declare class KnexDataProvider implements DataProvider {
    knex: Knex;
    constructor(knex: Knex);
    getEntityDataProvider(entity: EntityMetadata<any>): EntityDataProvider;
    transaction(action: (dataProvider: DataProvider) => Promise<void>): Promise<void>;
    static customFilter(build: CustomKnexFilterBuilderFunction): EntityFilter<any>;
    supportsCustomFilter?: boolean;
}
export declare type CustomKnexFilterBuilderFunction = () => Promise<(builder: Knex.QueryBuilder) => void>;
export declare class FilterConsumerBridgeToKnexRequest implements FilterConsumer {
    private nameProvider;
    _addWhere: boolean;
    promises: Promise<void>[];
    result: ((builder: Knex.QueryBuilder) => void)[];
    resolveWhere(): Promise<((builder: Knex.QueryBuilder<any, any>) => void)[]>;
    constructor(nameProvider: dbNameProvider);
    custom(key: string, customItem: any): void;
    or(orElements: Filter[]): void;
    isNull(col: FieldMetadata): void;
    isNotNull(col: FieldMetadata): void;
    isIn(col: FieldMetadata, val: any[]): void;
    isEqualTo(col: FieldMetadata, val: any): void;
    isDifferentFrom(col: FieldMetadata, val: any): void;
    isGreaterOrEqualTo(col: FieldMetadata, val: any): void;
    isGreaterThan(col: FieldMetadata, val: any): void;
    isLessOrEqualTo(col: FieldMetadata, val: any): void;
    isLessThan(col: FieldMetadata, val: any): void;
    containsCaseInsensitive(col: FieldMetadata, val: any): void;
    private add;
    databaseCustom(databaseCustom: {
        buildKnex: CustomKnexFilterBuilderFunction;
    }): void;
}
export declare class KnexSchemaBuilder {
    private knex;
    verifyStructureOfAllEntities(remult: Remult): Promise<void>;
    createIfNotExist(entity: EntityMetadata): Promise<void>;
    addColumnIfNotExist<T extends EntityMetadata>(entity: T, c: ((e: T) => FieldMetadata)): Promise<void>;
    verifyAllColumns<T extends EntityMetadata>(entity: T): Promise<void>;
    additionalWhere: string;
    constructor(knex: Knex);
}
export declare function buildColumn(x: FieldMetadata, dbName: string, b: Knex.CreateTableBuilder): void;
export declare function createKnexDataProvider(config: Knex.Config, autoCreateTables?: boolean): Promise<KnexDataProvider>;
