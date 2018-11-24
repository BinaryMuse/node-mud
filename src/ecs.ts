import { EventEmitter } from "events"

export interface Constructor<T> {
  new(...args: any[]): T
}

export type EventEmitterCallback = (...args: any[]) => void

export abstract class Component {}

export const EVENTS = {
  /// Emitted with an `Entity` whenever a new entity
  /// is created in the `World`.
  ENTITY_CREATED: Symbol("ENTITY_CREATED"),
  /// Emitted with an `Entity` just before the entity
  /// is deleted from the world. Note that the entity
  /// will not be valid on the next tick.
  ENTITY_DELETED: Symbol("ENTITY_DELETED"),
  /// Emitted with a `Component` and an `Entity`
  /// whenever a component was assigned to an entity.
  COMPONENT_ASSIGNED: Symbol("COMPONENT_ASSIGNED"),
  /// Emitted with a `Component` and an `Entity`
  /// whenever a component was removed from an entity.
  COMPONENT_REMOVED: Symbol("COMPONENT_REMOVED")
}

export class World {
  createEntity(): Entity {
    let id
    if (this.recycledIds.size > 0) {
      id = this.recycledIds.values().next().value
      this.recycledIds.delete(id)
    } else {
      this.lastId++
      id = this.lastId
    }
    const entity = new Entity(this, id)
    this.entities.set(id, entity)
    this.emit(EVENTS.ENTITY_CREATED, entity)
    return entity
  }

  getEntity(id: number): Entity | undefined {
    return this.entities.get(id)
  }

  releaseEntity(id: number): void {
    const entity = this.getEntity(id)
    this.emit(EVENTS.ENTITY_DELETED, entity)
    this.entities.delete(id)
    this.recycledIds.add(id)
  }

  withComponent<T extends Component>(klass: Constructor<T>): Readonly<Array<Entity>> {
    if (this.entitiesPerComponent.has(klass)) {
      const ids = [...this.entitiesPerComponent.get(klass)!.values()]
      return ids.map(this.getEntity.bind(this))
    } else {
      return []
    }
  }

  registerComponent<T extends Component>(klass: Constructor<T>, entityId: number): void {
    if (!this.entitiesPerComponent.has(klass)) {
      this.entitiesPerComponent.set(klass, new Set([entityId]))
    } else {
      this.entitiesPerComponent.get(klass)!.add(entityId)
    }
  }

  unregisterComponent<T extends Component>(klass: Constructor<T>, entityId: number): void {
    if (this.entitiesPerComponent.has(klass)) {
      this.entitiesPerComponent.get(klass)!.delete(entityId)
    }
  }

  addSystem<T extends System>(system: T): void {
    system.beginConfigure(this)
    this.systems.add(system)
  }

  removeSystem<T extends System>(system: T): void {
    this.systems.delete(system)
    system.unsubscribeAll()
    system.unconfigure()
  }

  emit(event: symbol, ...args: any[]): boolean {
    return this.emitter.emit(event, ...args)
  }

  subscribe(event: symbol, callback: EventEmitterCallback): Function {
    this.emitter.on(event, callback)
    return () => this.emitter.off(event, callback)
  }

  private emitter: EventEmitter = new EventEmitter
  private lastId: number = 0
  private entities: Map<number, Entity> = new Map()
  private entitiesPerComponent: Map<Constructor<Component>, Set<number>> = new Map()
  private systems: Set<System> = new Set()
  private recycledIds: Set<number> = new Set()
}

export class System {
  beginConfigure(world: World) {
    this.world_ = world
    this.configure()
  }

  get world() {
    return this.world_!
  }

  subscribe(event: symbol, callback: EventEmitterCallback): void {
    const unsub = this.world.subscribe(event, callback)
    if (this.subscriptions.has(event)) {
      this.subscriptions.get(event)!.set(callback, unsub)
    } else {
      const map = new Map()
      map.set(callback, unsub)
      this.subscriptions.set(event, map)
    }
  }

  subscribeToComponentAssignment<T extends Component>(klass: Constructor<T>, callback: (component: T, entity: Entity) => void): void {
    this.subscribe(EVENTS.COMPONENT_ASSIGNED, (component: Component, entity: Entity) => {
      if (component.constructor === klass) {
        callback(<T>component, entity)
      }
    })
  }

  subscribeToComponentRemoval<T extends Component>(klass: Constructor<T>, callback: (component: T, entity: Entity) => void): void {
    this.subscribe(EVENTS.COMPONENT_REMOVED, (component: Component, entity: Entity) => {
      if (component.constructor === klass) {
        callback(<T>component, entity)
      }
    })
  }

  unsubscribe(event: symbol, callback: EventEmitterCallback): boolean {
    if (!this.subscriptions.has(event)) {
      return false
    }

    const unsubs = this.subscriptions.get(event)!
    if (unsubs.has(callback)) {
      const unsub = unsubs.get(callback)!
      unsubs.delete(callback)
      unsub()
      return true
    } else {
      return false
    }
  }

  unsubscribeAll(): void {
    for (const [, unsubMap] of this.subscriptions) {
      for (const [, unsub] of unsubMap) {
        unsub()
      }
    }

    this.subscriptions.clear()
  }

  configure(): void {}
  unconfigure(): void {}
  tick(_world: World, _delta: number): void {}

  private world_: World | null = null
  private subscriptions: Map<Symbol, Map<EventEmitterCallback, Function>> = new Map()
}

export class Entity {
  constructor(world: World, id: number) {
    this.world = world
    this.id = id
  }

  addComponent<T extends Component>(component: T): void {
    const type = <Constructor<T>>component.constructor
    this.components.set(type, component)
    this.world.registerComponent(type, this.getId())
    this.world.emit(EVENTS.COMPONENT_ASSIGNED, component, this)
  }

  hasComponent<T extends Component>(klass: Constructor<T>): boolean {
    return this.components.has(klass)
  }

  getComponent<T extends Component>(klass: Constructor<T>): T | undefined {
    return <T>this.components.get(klass)
  }

  removeComponent<T extends Component>(klass: Constructor<T>): boolean {
    const component = this.getComponent(klass)
    if (component) {
      this.components.delete(klass)
      this.world.unregisterComponent(klass, this.getId())
      this.world.emit(EVENTS.COMPONENT_REMOVED, component, this)
      return true
    } else {
      return false
    }
  }

  getId(): number {
    return this.id
  }

  private world: World
  private id: number
  private components: Map<Constructor<Component>, Component> = new Map()
}
