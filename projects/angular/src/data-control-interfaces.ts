import { column, columnDefs, ColumnSettings, Entity, ValueListItem } from "@remult/core";


export type DataControlInfo<rowType> = DataControlSettings<rowType> | column<any, any>;
export interface DataControlSettings<entityType = any, colType = any> {

    column?: columnDefs;
    getValue?: (row: entityType, val: column<colType, entityType>) => any;
    readOnly?: ValueOrEntityExpression<boolean, entityType>;
    cssClass?: (string | ((row: entityType) => string));

    caption?: string;
    visible?: (row: entityType,val: column<colType, entityType>) => boolean;

    click?: (row: entityType,val: column<colType, entityType>) => void;
    allowClick?: (row: entityType) => boolean;
    clickIcon?: string;

    valueList?: ValueListItem[] | string[] | any[] | Promise<ValueListItem[]> | (() => Promise<ValueListItem[]>);
    inputType?: string; //used: password,date,tel,text,checkbox,number
    hideDataOnInput?: boolean;//consider also setting the width of the data on input - for datas with long input
    forceEqualFilter?: boolean;

    width?: string;
}


export function extend<T extends columnDefs>(col: T): {
    dataControl(set: (settings: DataControlSettings) => void): T;
} {
    return {
        dataControl: (set) => {
            let configureDataControl: (settings: DataControlSettings) => void = col[configDataControlField];
            if (configureDataControl) {
                var existing = configureDataControl;
                configureDataControl = z => {
                    existing(z);
                    set(z);
                }
            }
            else
                configureDataControl = set;
            col[configDataControlField] = configureDataControl;
            return col;
        }
    }
}




export const configDataControlField = Symbol('configDataControlField');

export function decorateDataSettings(col: columnDefs, x: DataControlSettings) {
    let settingsOnColumnLevel = Reflect.getMetadata(configDataControlField, col.target, col.key);
    if (settingsOnColumnLevel) {
        for (const key in settingsOnColumnLevel) {
            if (Object.prototype.hasOwnProperty.call(settingsOnColumnLevel, key)) {
                const element = settingsOnColumnLevel[key];
                if (!x[key])
                    x[key] = element;
            }
        }
        x = Object.assign({}, settingsOnColumnLevel, x);
    }
    if (!x.caption && col.caption)
        x.caption = col.caption;
    if (!x.inputType && col.inputType)
        x.inputType = col.inputType;

    if (x.readOnly == undefined) {
        if (col.dbReadOnly)
            x.readOnly = true;
        else

            if (typeof col.allowApiUpdate === 'boolean')
                x.readOnly = !col.allowApiUpdate;


    }
    /*


    col[__displayResult] = __getDataControlSettings(col);
    if (col[__displayResult]) {
        if (!x.getValue && col[__displayResult].getValue) {
            x.getValue = e => {
                let c: columnDefs = col;
                if (e)
                    c = getEntityOf(e).columns.find(c) as columnDefs;
                if (!c[__displayResult])
                    c[__displayResult] = __getDataControlSettings(c);
                return c[__displayResult].getValue(e);
            };
        }
        if (!x.click && col[__displayResult].click) {
            x.click = e => {
                let c: columnDefs = col;
                if (e)
                    c = getEntityOf(e).columns.find(c) as columnDefs;
                if (!c[__displayResult])
                    c[__displayResult] = __getDataControlSettings(c);
                c[__displayResult].click(e);
            };
        }
        if (!x.allowClick && col[__displayResult].allowClick) {
            x.allowClick = e => {
                let c: columnDefs = col;
                if (e)
                    c = getEntityOf(e).columns.find(c) as columnDefs;
                if (!c[__displayResult])
                    c[__displayResult] = __getDataControlSettings(c);
                return c[__displayResult].allowClick(e);
            };
        }
        for (const key in col[__displayResult]) {
            if (col[__displayResult].hasOwnProperty(key)) {
                const val = col[__displayResult][key];
                if (val !== undefined && x[key] === undefined) {
                    x[key] = val;
                }
            }
        }
    }*/
}
const __displayResult = Symbol("__displayResult");

export function __getDataControlSettings(col: columnDefs): DataControlSettings {
    let settings = Reflect.getMetadata(configDataControlField, col.target, col.key);

    // if (col[configDataControlField]) {
    //     let r = {};
    //     col[configDataControlField](r);
    //     return r;
    // }
    /*if (col instanceof ValueListColumn) {
        col[configDataControlField] = (x: DataControlSettings) => {
            x.valueList = col.getOptions();
        };
    }*/
    return undefined;
}
export declare type ValueOrEntityExpression<valueType, entityType> = valueType | ((e: entityType) => valueType);

export function DataControl(settings: DataControlSettings) {
    return (target, key) => {
        Reflect.defineMetadata(configDataControlField, settings, target, key);
    }
}