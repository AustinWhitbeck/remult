import type { FastifyInstance, FastifyPluginCallback, RouteHandlerMethod, FastifyRequest } from 'fastify';
import { createRemultServer } from './server/index';
import { GenericRequestHandler, GenericResponse, GenericRouter, RemultServer, createRemultServerCore, RemultServerOptions, SpecificRoute } from './server/expressBridge';
import { initAsyncHooks } from './server/initAsyncHooks';


export function remultFastify(options: RemultServerOptions<FastifyRequest>): FastifyPluginCallback & RemultServer {
    function fastifyHandler(handler: GenericRequestHandler) {
        const response: RouteHandlerMethod = (req, res) => {
            const myRes: GenericResponse = {
                status(statusCode) {
                    res.status(statusCode);
                    return myRes;
                },
                end() {
                    res.send();
                },
                json(data) {
                    res.send(data);
                }
            };
            handler(req, myRes, () => { });
        };
        return response;
    }
    const api = createRemultServer(options);
    const pluginFunction: FastifyPluginCallback = async (instance: FastifyInstance, op) => {
        //@ts-ignore
        let fastifyRouter: GenericRouter = {
            route(path) {
                let r = {
                    delete(handler) {
                        instance.delete(path, fastifyHandler(handler));
                        return r;
                    },
                    get(handler) {
                        instance.get(path, fastifyHandler(handler));
                        return r;

                    }, post(handler) {
                        instance.post(path, fastifyHandler(handler));
                        return r;

                    }, put(handler) {
                        instance.put(path, fastifyHandler(handler));
                        return r;

                    },
                } as SpecificRoute;
                return r;
            },
        };
        api.registerRouter(fastifyRouter);

    };

    return Object.assign(pluginFunction, {
        getRemult: x => api.getRemult(x),
        openApiDoc: x => api.openApiDoc(x),
        handle: (req, res) => api.handle(req, res),
        withRemult: (req, res, next) => api.withRemult(req, res, next)
    } as RemultServer);
}
