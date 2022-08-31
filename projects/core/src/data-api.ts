import { AndFilter, customUrlToken, buildFilterFromRequestParameters } from './filter/filter-interfaces.js';
import { Remult, UserInfo } from './context.js';
import { Filter } from './filter/filter-interfaces.js';
import { FindOptions, Repository, EntityRef, rowHelperImplementation, EntityFilter } from './remult3/index.js';
import { ErrorInfo } from './data-interfaces.js';

export class DataApi<T = any> {

  constructor(private repository: Repository<T>, private remult: Remult) {
  }
  httpGet(res: DataApiResponse, req: DataApiRequest) {
    if (req.get("__action") == "count") {
      return this.count(res, req);
    } else
      return this.getArray(res, req);
  }
  httpPost(res: DataApiResponse, req: DataApiRequest, body: any) {
    switch (req.get("__action")) {
      case "get":
        return this.getArray(res, req, body);
      case "count":
        return this.count(res, req, body);
      default:
        return this.post(res, body);
    }
  }
  static defaultGetLimit = 0;
  async get(response: DataApiResponse, id: any) {
    if (!this.repository.metadata.apiReadAllowed) {
      response.forbidden();
      return;
    }
    await this.doOnId(response, id, async row => response.success(this.repository.getEntityRef(row).toApiJson()));
  }
  async count(response: DataApiResponse, request: DataApiRequest, filterBody?: any) {
    if (!this.repository.metadata.apiReadAllowed) {
      response.forbidden();
      return;
    }
    try {

      response.success({ count: +await this.repository.count(await this.buildWhere(request, filterBody)) });
    } catch (err) {
      response.error(err);
    }
  }


  async getArray(response: DataApiResponse, request: DataApiRequest, filterBody?: any) {
    if (!this.repository.metadata.apiReadAllowed) {
      response.forbidden();
      return;
    }
    try {
      let findOptions: FindOptions<T> = { load: () => [] };
      findOptions.where = await this.buildWhere(request, filterBody);
      if (this.remult.isAllowed(this.repository.metadata.options.apiRequireId)) {
        let hasId = false;
        let w = await Filter.fromEntityFilter(this.repository.metadata, findOptions.where);
        if (w) {
          w.__applyToConsumer({
            containsCaseInsensitive: () => { },
            isDifferentFrom: () => { },
            isEqualTo: (col, val) => {
              if (this.repository.metadata.idMetadata.isIdField(col))
                hasId = true;
            },
            custom: () => { },
            databaseCustom: () => { },
            isGreaterOrEqualTo: () => { },
            isGreaterThan: () => { },
            isIn: () => { },
            isLessOrEqualTo: () => { },
            isLessThan: () => { },
            isNotNull: () => { },
            isNull: () => { },

            or: () => { }
          });
        }
        if (!hasId) {
          response.forbidden();
          return
        }
      }
      if (request) {

        let sort = <string>request.get("_sort");
        if (sort != undefined) {
          let dir = request.get('_order');
          findOptions.orderBy = determineSort(sort, dir);

        }
        let limit = +request.get("_limit");
        if (!limit && DataApi.defaultGetLimit)
          limit = DataApi.defaultGetLimit;
        findOptions.limit = limit;
        findOptions.page = +request.get("_page");

      }
      await this.repository.find(findOptions)
        .then(async r => {
          response.success(await Promise.all(r.map(async y => this.repository.getEntityRef(y).toApiJson())));
        });
    }
    catch (err) {
      response.error(err);
    }
  }
  private async buildWhere(request: DataApiRequest, filterBody: any): Promise<EntityFilter<any>> {
    var where: EntityFilter<any>[] = [];
    if (this.repository.metadata.options.apiPrefilter) {
      if (typeof this.repository.metadata.options.apiPrefilter === "function")
        where.push(await this.repository.metadata.options.apiPrefilter());
      else
        where.push(this.repository.metadata.options.apiPrefilter);
    }
    if (request) {
      where.push(buildFilterFromRequestParameters(this.repository.metadata, {
        get: key => {
          let result = request.get(key);
          if (key.startsWith(customUrlToken) && result)
            return JSON.parse(result);
          return result;
        }
      }));
    }
    if (filterBody)
      where.push(Filter.entityFilterFromJson(this.repository.metadata, filterBody))
    return { $and: where };
  }



  private async doOnId(response: DataApiResponse, id: any, what: (row: T) => Promise<void>) {
    try {



      await this.repository.find({
        where: { $and: [this.repository.metadata.options.apiPrefilter, this.repository.metadata.idMetadata.getIdFilter(id)] } as EntityFilter<any>
      })
        .then(async r => {
          if (r.length == 0)
            response.notFound();
          else if (r.length > 1)
            response.error({ message: "id is not unique" });
          else
            await what(r[0]);
        });
    } catch (err) {
      response.error(err);
    }
  }
  async put(response: DataApiResponse, id: any, body: any) {

    await this.doOnId(response, id, async row => {
      let ref = this.repository.getEntityRef(row) as rowHelperImplementation<T>;
      await ref._updateEntityBasedOnApi(body);
      if (!ref.apiUpdateAllowed) {
        response.forbidden();
        return;
      }
      await this.repository.getEntityRef(row).save();
      response.success(this.repository.getEntityRef(row).toApiJson());
    });
  }

  async delete(response: DataApiResponse, id: any) {
    await this.doOnId(response, id, async row => {

      if (!this.repository.getEntityRef(row).apiDeleteAllowed) {
        response.forbidden();
        return;
      }
      await this.repository.getEntityRef(row).delete();
      response.deleted();
    });
  }


  async post(response: DataApiResponse, body: any) {

    try {
      let newr = this.repository.create();
      await (this.repository.getEntityRef(newr) as rowHelperImplementation<T>)._updateEntityBasedOnApi(body);
      if (!this.repository.getEntityRef(newr).apiInsertAllowed) {
        response.forbidden();
        return;
      }

      await this.repository.getEntityRef(newr).save();
      response.created(this.repository.getEntityRef(newr).toApiJson());
    } catch (err) {
      response.error(err);
    }
  }

}

export interface DataApiResponse {
  success(data: any): void;
  deleted(): void;
  created(data: any): void;
  notFound(): void;
  error(data: ErrorInfo): void;
  forbidden(): void;
  progress(progress: number): void;

}




export interface DataApiRequest {
  get(key: string): any;
}
export function determineSort(sortUrlParm: string, dirUrlParam: string) {
  let dirItems: string[] = [];
  if (dirUrlParam)
    dirItems = dirUrlParam.split(',');
  let result: any = {};
  sortUrlParm.split(',').map((name, i) => {
    let key = name.trim();
    if (i < dirItems.length && dirItems[i].toLowerCase().trim().startsWith("d"))
      return result[key] = "desc";
    else
      return result[key] = "asc";
  });
  return result;

}



export function serializeError(data: ErrorInfo) {
  if (data instanceof TypeError) {
    data = { message: data.message, stack: data.stack };
  }
  let x = JSON.parse(JSON.stringify(data));
  if (!x.message && !x.modelState)
    data = { message: data.message, stack: data.stack };
  if (typeof x === 'string')
    data = { message: x };
  return data;
}