import type { ClassType } from "../classType";
import type { Allowed, AllowedForInstance, ApiClient, GetArguments, Remult, RemultContext, UserInfo } from "./context";
import type { DataProvider } from "./data-interfaces";
import { LiveQueryClient } from "./live-query/LiveQueryClient";
import type { LiveQueryChangesListener, LiveQueryStorage, SubscriptionServer } from "./live-query/SubscriptionServer";
import type { Repository } from "./remult3";


/*@internal*/
export class RemultProxy implements Remult {
    static defaultRemult: Remult;
    /* @internal*/
    get liveQuerySubscriber() { return this.remultFactory().liveQuerySubscriber };
    /* @internal*/
    set liveQuerySubscriber(val: LiveQueryClient) { this.remultFactory().liveQuerySubscriber = val };

    /* @internal*/
    get liveQueryStorage() { return this.remultFactory().liveQueryStorage };
    /* @internal*/
    set liveQueryStorage(val: LiveQueryStorage) { this.remultFactory().liveQueryStorage = val };

    /* @internal*/
    get liveQueryPublisher() {
        return this.remultFactory().liveQueryPublisher;
    }
    /* @internal*/
    set liveQueryPublisher(val: LiveQueryChangesListener) {
        this.remultFactory().liveQueryPublisher = val;
    }
    call<T extends ((...args: any[]) => Promise<any>)>(backendMethod: T, self?: any, ...args: GetArguments<T>): ReturnType<T> {
        return this.remultFactory().call(backendMethod, self, ...args);
    }
    get context(): RemultContext {
        return this.remultFactory().context;
    }


    get dataProvider(): DataProvider { return this.remultFactory().dataProvider };
    set dataProvider(provider: DataProvider) { this.remultFactory().dataProvider = provider }
    get repCache(): Map<DataProvider, Map<ClassType<any>, Repository<any>>> { return this.remultFactory().repCache };

    authenticated(): boolean {
        return this.remultFactory().authenticated()
    }
    isAllowed(roles?: Allowed): boolean {
        return this.remultFactory().isAllowed(roles);
    }
    isAllowedForInstance(instance: any, allowed?: AllowedForInstance<any>): boolean {
        return this.remultFactory().isAllowedForInstance(instance, allowed);
    }

    clearAllCache() {
        return this.remultFactory().clearAllCache();
    }
    /*@internal*/
    remultFactory = () => RemultProxy.defaultRemult;

    /*@internal*/
    resetFactory() {
        this.remultFactory = () => RemultProxy.defaultRemult;
    }


    repo: typeof RemultProxy.defaultRemult.repo = (...args) => this.remultFactory().repo(...args);
    get user() {
        return this.remultFactory().user;
    }
    set user(info: UserInfo | undefined) {
        this.remultFactory().user = info;
    }
    get apiClient(): ApiClient {
        return this.remultFactory().apiClient;
    }
    set apiClient(client: ApiClient) {
        this.remultFactory().apiClient = client;
    }
    get subscriptionServer() {
        return this.remultFactory().subscriptionServer;
    }
    set subscriptionServer(value: SubscriptionServer) {
        this.remultFactory().subscriptionServer = value;
    }

}


export const remult: Remult = new RemultProxy();
