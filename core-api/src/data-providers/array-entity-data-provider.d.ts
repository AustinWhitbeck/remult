import { EntityDataProvider, EntityDataProviderFindOptions } from '../data-interfaces.js';
import { Filter } from '../filter/filter-interfaces.js';
import { EntityMetadata, EntityFilter } from '../remult3/index.js';
export declare class ArrayEntityDataProvider implements EntityDataProvider {
    private entity;
    private rows?;
    static customFilter(filter: CustomArrayFilter): EntityFilter<any>;
    constructor(entity: EntityMetadata, rows?: any[]);
    private verifyThatRowHasAllNotNullColumns;
    count(where?: Filter): Promise<number>;
    find(options?: EntityDataProviderFindOptions): Promise<any[]>;
    translateFromJson(row: any): {};
    translateToJson(row: any): {};
    private idMatches;
    update(id: any, data: any): Promise<any>;
    delete(id: any): Promise<void>;
    insert(data: any): Promise<any>;
}
export declare type CustomArrayFilter = (item: any) => boolean;
export interface CustomArrayFilterObject {
    arrayFilter: CustomArrayFilter;
}
