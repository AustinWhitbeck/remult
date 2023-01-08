import { EntityMetadata } from './remult3';
export interface SqlImplementation {
    getLimitSqlSyntax(limit: number, offset: number): any;
    createCommand(): SqlCommand;
    transaction(action: (sql: SqlImplementation) => Promise<void>): Promise<void>;
    entityIsUsedForTheFirstTime(entity: EntityMetadata): Promise<void>;
}
export interface SqlCommand extends SqlCommandWithParameters {
    execute(sql: string): Promise<SqlResult>;
}
export interface SqlCommandWithParameters {
    addParameterAndReturnSqlToken(val: any): string;
}
export interface SqlResult {
    rows: any[];
    getColumnKeyInResultForIndexInSelect(index: number): string;
}
