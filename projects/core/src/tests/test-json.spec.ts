
import { TestDataApiResponse } from "./TestDataApiResponse";
import { Done } from "./Done";
import { Remult } from '../context';

import { JsonDataProvider } from '../data-providers/json-data-provider';
import { InMemoryDataProvider } from '../data-providers/in-memory-database';

import { IdEntity } from '../id-entity';

import { DataApi } from '../data-api';

import { Categories as newCategories } from './remult-3-entities';
import { Field, Entity, EntityBase, IntegerField, StringField } from '../remult3';
import { tasks } from './tasks';


@Entity('entityWithAutoId', { dbAutoIncrementId: true })
class entityWithAutoId extends EntityBase {
    @IntegerField()
    id: number;
    @StringField()
    name: string;
}


describe("test json database", () => {
    let db = new JsonDataProvider(localStorage);
    let remult = new Remult();
    remult.setDataProvider(db);
    async function deleteAll() {
        for (const c of await remult.repo(newCategories).find()) {
            await c._.delete();
        }
    }
    it("test auto increment", async () => {
        let remult = new Remult();
        remult.setDataProvider(new InMemoryDataProvider());
        let p = await remult.repo(entityWithAutoId).create({ name: 'a' }).save();
        expect(p.id).toBe(1);
        p = await remult.repo(entityWithAutoId).create({ name: 'b' }).save();
        expect(p.id).toBe(2);

    });

    it("test basics", async () => {
        await deleteAll();
        expect(await remult.repo(newCategories).count()).toBe(0);
        let promisis = [];
        for (let index = 1; index < 4; index++) {
            let c = remult.repo(newCategories).create();
            c.id = index;
            c.categoryName = "noam" + index;
            promisis.push(c._.save());
        }
        await Promise.all(promisis);
        expect(await remult.repo(newCategories).count()).toBe(3, 'count');
        let cats = await remult.repo(newCategories).find();
        expect(cats.length).toBe(3);
        expect(cats[0].id).toBe(1);
        expect(cats[0].categoryName).toBe("noam1");
    });

});
describe("test tasks", () => {
    it("test tasks", async () => {
        let storage = '';
        let db = new JsonDataProvider({
            getItem: () => storage,
            setItem: (x, y) => storage = y
        });
        let cont = new Remult();
        cont.setDataProvider(db);
        let c = cont.repo(tasks);
        let t = c.create();
        t.id = 1;
        await t._.save();
        t = c.create();
        t.id = 2;
        t.completed = true;
        await t._.save();
        t = c.create();
        t.id = 3;
        t.completed = true;
        await t._.save();

        expect(await c.count({ completed: { $ne: true } })).toBe(1);
        expect(await c.count({ completed: true })).toBe(2);
        expect(await c.count({ completed: false })).toBe(1);
        var api = new DataApi(c, cont);
        let tr = new TestDataApiResponse();
        let d = new Done();
        tr.success = async (data) => {
            d.ok();
            expect(data.length).toBe(1);
        }
        await api.getArray(tr, {
            get: x => {
                if (x == 'completed_ne')
                    return 'true';
                return undefined;
            }
        });
        d.test();
    });
    
});
