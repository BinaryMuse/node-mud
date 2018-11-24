# Node.js ECS MUD

This repo is an experiment implementing an online MUD using an [ECS](https://en.wikipedia.org/wiki/Entity%E2%80%93component%E2%80%93system) architecture.

[wip]

## ECS Architecture

`src/ecs.ts` contains a simple implementation of the ECS architecture.

```javascript
import { World, Entity, Component, System, EVENTS } from './ecs'
```

### `World`

The world is a container for all the registered entities and systems. It performs the following functions:

* Creates and destroys entities
* Maintains a list of active systems
* Manages an `EventEmitter` for cross-system communication
* Actives all systems on a recurring timer

**`new World()`**

Constructs a new `World`.

**`World#start(interval: number): void`**

Starts the `World`, calling the `tick` function of all registered systems every `interval` milliseconds.

**`World#stop(): void`**

Stops the `World`, pausing `tick` calls.

**`World#createEntity(): Entity`**

Creates and returns a new `Entity` with a unique ID.

**`World#getEntity(id: number): Entity | undefined`**

Looks up an existing entity by its ID. Returns the `Entity` or `undefined` if it was not found.

**`World#releaseEntity(id: number): void`**

Deletes the entity with the given ID from the world. Emits the `ENTITY_DELETED` event just before deletion occurs. The ID of the deleted entity may be reused for future entities.

**`World#withComponent(klass: Constructor<Component>): ReadonlyArray<Entity>`**

Given a `Component` subclass `klass`, returns an array of `Entity` objects that have that component registered.

**`World#addSystem(system: System): void`**

Adds a new system to the world. The `System`'s `configure()` method is called; see the documentation of `System#configure` for more information.

**`World#removeSystem(system: System): void`**

Removes a system from the world and unsubscribes it from all events. The `System`'s `unconfigure()` method is called; see the documentation of `System#unconfigure` for more information.

**`World#emit(event: Symbol, ...args: any[]): void`**

Asynchronously (with `process.nextTick`) emits an event with the type `event` on the `World`'s `EventEmitter` along with the specified arguments.

**`World#subscribe(event: Symbol, callback: Function): Function`**

Subscribes to events of the `event` type, calling the passed `callback` for each event as described in [`EventEmitter#on`](https://nodejs.org/api/events.html#events_emitter_on_eventname_listener). Returns a function that can be called to remove the subscription.

### Entity

An `Entity` is essentially an ID unique to a given `World` and a list of `Component`s.

**`Entity#addComponent(component: Component): void`**

Adds `component` to the entity's list of components. Only one component per `Component` subclass can exist on an entity at any given time; additional calls with the same type will replace the existing component. Emits the `COMPONENT_ASSIGNED` event.

**`Entity#hasComponent(klass: Constructor<Component>): boolean`**

Returns `true` of the entity contains data for the component constructor `klass`, and `false` otherwise.

**`Entity#getComponent(klass: Constructor<Component>): Component | undefined`**

Returns the component data associated with the `Component` subclass `klass`, or `undefined` if the component doesn't exist on the entity.

**`Entity#removeComponent(klass: Constructor<Component>): boolean`**

Removes the component data associated with the `Component` subclass `klass` and returns true, or returns false if the component doesn't exist on the entity.

**`Entity#getId(): number`**

Return the entity's ID.

### Component

A component is simply a class that tags an entity with some data. Components generally shouldn't contain any business logic and only exist to help systems know which entities to interact with.

To create a custom component, simply subclass `Component` and add properties or getters/setters as appropriate.

### System

Systems are the parts of the ECS architecture that actually do things; in general, each system is specialized and acts on entities that contain relevant components. In general, systems will act on the world by either (1) responding to events, or (2) iterating over certain entities during a game tick.

When you subclass `System`, you can implement `configure`, `unconfigure`, and `tick` to customize the behavior of your system.

**`System#configure(): void`**

Called when the system is added to the world. Implement this function to customize behavior for your system. The world can be accessed in this method as `this.world`.

**`System#unconfigure(): void`**

Called when the system is removed from the world. Implement this function to customize behavior for your system. The world can be accessed in this method as `this.world`.

**`System#tick(world: World, delta: number): void`**

Called on every tick of the world. `delta` is the number of milliseconds since the last tick, or since `World#start` was called in the case of the first tick. Implement this function to customize behavior for your system.

**`System#subscribe(event: Symbol, callback: Function): void`**

Calls `World#subscribe(event, callback)` and automatically tracks the unsubscription function so that the subscriptions is automatically removed when the system is removed from the world.

**`System#subscribeToComponentAssignment(klass: Constructor<Component>, callback: Function)`**

It's often useful to know when a specific component type has been added to an entity. This uses the `COMPONENT_ASSIGNED` event under the hood to call the callback whenever a component of the type `klass` is added to any entity. The callback is called with the `Component` itself and the `Entity` it was added to.

**`System#subscribeToComponentRemoval(klass: Constructor<Component>, callback: Function)`**

It's often useful to know when a specific component type has been removed from an entity. This uses the `COMPONENT_REMOVED` event under the hood to call the callback whenever a component of the type `klass` is added to any entity. The callback is called with the `Component` itself and the `Entity` it was removed from.

### Events

There are a few built-in event types that a `World` will emit from time to time. Here are the events and the parameter types they're emitted with.

**`ENTITY_CREATED(entity: Entity)`**

Emitted when a new entity is created.

**`ENTITY_DELETED(entity: Entity)`**

Emitted just before an entity is deleted from the world. Accessing the entity asynchronously is not valid as the entity will be invalidated at the end of the current tick.

**`COMPONENT_ADDED(component: Component, entity: Entity)`**

Emitted when a component is added to an entity. Used by `System#subscribeToComponentAssignment`.

**`COMPONENT_REMOVED(component: Component, entity: Entity)`**

Emitted when a component is removed from an entity. Used by `System#subscribeToComponentRemoval`.
