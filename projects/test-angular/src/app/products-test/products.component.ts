import { Component, NgZone, OnInit } from '@angular/core';
import { Remult, Entity, IdEntity, Fields, Controller, InMemoryDataProvider, Sort, BackendMethod } from 'remult';
import { GridSettings } from '@remult/angular/interfaces';
import { DialogConfig } from '../../../../angular';
import * as ably from 'ably';



@Controller("blabla")

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
  //,changeDetection: ChangeDetectionStrategy.OnPush
})
@DialogConfig({
  height: '1500px'
})
export class ProductsComponent implements OnInit {
  constructor(private remult: Remult, private zone: NgZone) {
    remult.liveQuerySubscriber.wrapMessageHandling = x => zone.run(() => x());
    if (false) {
      const p = new AblyLiveQueryProvider(new ably.Realtime.Promise(
        {
          async authCallback(data, callback) {
            try {
              callback(null, await ProductsComponent.getAblyToken())
            }
            catch (error: any) {
              callback(error, null);
            }
          },
        }

      ))
      remult.liveQuerySubscriber = new LiveQueryClient(p);
    }
  }


  grid = new GridSettings(this.remult.repo(Task), {
    allowCrud: true, gridButtons: [{
      name: 'reload',
      click: () => {
        this.grid.reloadData();
      }
    }]
  });

  messages: string[] = [];
  async ngOnInit() {
    await this.remult.repo(Task).count();



  }
  tasks: Observable<Task[]> = new Observable((x) => {
    let tasks: Task[] = [];
    return this.remult.repo(Task).query().subscribe(newResult => {
      tasks = newResult(tasks);
      x.next(tasks);
    })
  });

  @BackendMethod({ allowed: true })
  static async getAblyToken() {
    const a = new ably.Realtime.Promise(process.env.ABLY_KEY);
    return await a.auth.createTokenRequest({
      capability: {
        [`*`]: ["subscribe"]
      }
    });
  }
}


export const helper = {
  onSaved: (t: Task) => { },
  onDeleted: (t: Task) => { },
}

@Entity<Task>("tasks", {
  allowApiCrud: true,
  saved: item => {
    helper.onSaved(item);
  },
  deleted: item => {
    helper.onDeleted(item)
  }
})
export class Task extends IdEntity {

  @Fields.string()
  title = '';
  @Fields.boolean()
  completed = false;
}



import { Observable } from 'rxjs';
import { AblyLiveQueryProvider } from '../../../../core/live-query/ably';
import { LiveQueryClient } from '../../../../core/live-query';



