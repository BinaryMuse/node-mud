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

### System

Systems are the parts of the ECS architecture that actually do things; in general, each system is specialized and acts on entities that contain relevant components.
