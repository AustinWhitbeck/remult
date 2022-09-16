# CRUD Operations

## Rename Tasks and Mark as Completed

To make the tasks in the list updatable, we'll bind the `input` elements to the `Task` properties and add a *Save* button to save the changes to the backend database.

1. Add a `saveTask` method to save the state of a task to the backend database 

   *src/app/todo/todo.component.ts*
   ```ts
   async saveTask(task: Task) {
        const savedTask = await this.taskRepo.save(task);
        this.tasks = this.tasks.map(t => t === task ? savedTask : t);
   }
   ```
    ::: warning Why update the task array after saving a task?
    Remult's `Repository.save` method issues either a `PUT` or a `POST` request, depending on the existence of an `id` value in the `Task` object. 

    In the next section of the tutorial, we'll add new tasks to the list by creating `Task` objects and saving them using the same `saveTask` function. So, to make sure a newly created task is only `POST`-ed once, we must replace it with the return value of `Repository.save`, which contains an `id`.
    :::

2. Modify the contents of the `tasks` div to include the following `input` elements and a *Save* button to call the `saveTask` method.

   *src/app/todo/todo.component.html*
   ```html{9-14}
   <input
       type="checkbox"
       [(ngModel)]="hideCompleted"
       (change)="fetchTasks()"
   >
   Hide Completed
   <main>
       <div *ngFor="let task of tasks">
           <input
               type="checkbox"
               [(ngModel)]="task.completed"
           >
           <input [(ngModel)]="task.title">
           <button (click)="saveTask(task)">Save</button>
       </div>
   </main>
   ```

Make some changes and refresh the browser to verify the backend database is updated.
## Add New Tasks

1. Add the following `addTask` method to the `TodoComponent` class:

*src/app/todo/todo.component.ts*
```ts
addTask() {
   this.tasks.push(new Task());
}
```

2. Add an *Add Task* button in the html template:

*src/app/todo/todo.component.html*
```html{17}
<input
    type="checkbox"
    [(ngModel)]="hideCompleted"
    (change)="fetchTasks()"
>
Hide Completed
<main>
    <div *ngFor="let task of tasks">
        <input
            type="checkbox"
            [(ngModel)]="task.completed"
        >
        <input [(ngModel)]="task.title">
        <button (click)="saveTask(task)">Save</button>
    </div>
</main>
<button (click)="addTask()">Add Task</button>
```

Add a few tasks and refresh the browser to verify the backend database is updated.

## Delete Tasks

Let's add a *Delete* button next to the *Save* button of each task in the list.

1. Add the following `deleteTask` method to the `TodoComponent` class:

*src/app/todo/todo.component.ts*
```ts
async deleteTask(task: Task) {
   await this.taskRepo.delete(task);
   this.tasks = this.tasks.filter(t => t !== task);
}
```

2. Add a *Delete* button in the html:

*src/app/todo/todo.component.html*
```html{15}
<input
    type="checkbox"
    [(ngModel)]="hideCompleted"
    (change)="fetchTasks()"
>
Hide Completed
<main>
    <div *ngFor="let task of tasks">
        <input
            type="checkbox"
            [(ngModel)]="task.completed"
        >
        <input [(ngModel)]="task.title">
        <button (click)="saveTask(task)">Save</button>
        <button (click)="deleteTask(task)">Delete</button>
    </div>
</main>
<button (click)="addTask()">Add Task</button>
```