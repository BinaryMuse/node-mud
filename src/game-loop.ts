import * as ecs from "./ecs"
import { HasConnection, EVENTS as NET_EVENTS } from "./network"

export const EVENTS = {
  /// Emitted with `username: string` and `entity: Entity`
  /// when a player successfully logs in under a given name
  LOGIN_SUCCESS: Symbol(),
}

class LoggingIn extends ecs.Component {
  public state: "WAITING_USERNAME" | "WAITING_PASSWORD" = "WAITING_USERNAME"
  public username: string | null = null
}

class InGameWorld extends ecs.Component {
  constructor(username: string) {
    super()
    this.username = username
  }

  public username: string
}

export class LoginSystem extends ecs.System {
  constructor(database: Map<string, string>) {
    super()
    this.database = database
  }

  configure() {
    this.subscribeToComponentAssignment(HasConnection, (component, entity) => {
      if (!component.wasReassigned) {
        entity.addComponent(new LoggingIn())
        this.send(entity, "Welcome! Please enter your username: ")
      }
    })

    this.subscribe(NET_EVENTS.PLAYER_INPUT, (line: string, entity: ecs.Entity) => {
      const login = entity.getComponent(LoggingIn)
      if (login) {
        switch (login.state) {
          case "WAITING_USERNAME":
            login.state = "WAITING_PASSWORD"
            login.username = line
            this.send(entity, "Please enter your password: ")
            break
          case "WAITING_PASSWORD":
            const realPass = this.database.get(login.username!)
            if (!realPass || realPass !== line) {
              this.send(entity, "\nYour username or password was incorrect. Please try again.\nPlease enter your username: ")
              login.state = "WAITING_USERNAME"
            } else if (realPass === line) {
              this.send(entity, "Logging you in...\n")
              entity.removeComponent(LoggingIn)
              this.world.emit(EVENTS.LOGIN_SUCCESS, login.username, entity)
            }
            break
        }
      }
    })
  }

  send(entity: ecs.Entity, data: string | Buffer): void {
    this.world.emit(NET_EVENTS.SEND_DATA, entity, data)
  }

  private database: Map<string, string>
}

export class GameInputSystem extends ecs.System {
  constructor() {
    super()
  }

  configure() {
    this.subscribe(EVENTS.LOGIN_SUCCESS, this.handleLoginSuccess.bind(this))
    this.subscribe(NET_EVENTS.PLAYER_INPUT, this.handlePlayerInput.bind(this))

    this.subscribeToComponentRemoval(HasConnection, (_component, entity) => {
      if (this.quittingEntityIds.has(entity.getId())) {
        this.quittingEntityIds.delete(entity.getId())
        const inGame = entity.getComponent(InGameWorld)
        if (inGame) {
          this.entityIdsByName.delete(inGame.username)
        }
        this.world.releaseEntity(entity.getId())
      }
    })
  }

  handleLoginSuccess(username: string, entity: ecs.Entity): void {
    const existingEnt = this.getEntityFor(username)
    if (existingEnt) {
      // This means that a user disconnected without quitting,
      // as their entity is still in the world.
      // Attach their connection to that entity.
      this.world.emit(NET_EVENTS.SWITCH_CONN_OWNERSHIP, entity, existingEnt)
      existingEnt.addComponent(new InGameWorld(username))
      this.entityIdsByName.set(username, existingEnt.getId())
    } else {
      entity.addComponent(new InGameWorld(username))
      this.entityIdsByName.set(username, entity.getId())
    }
  }

  handlePlayerInput(line: string, entity: ecs.Entity): void {
    if (!entity.hasComponent(InGameWorld)) {
      return
    }

    switch (line.toLowerCase()) {
      case 'quit':
        this.quittingEntityIds.add(entity.getId())
        this.world.emit(NET_EVENTS.PERFORM_DISCONNECT, entity)
        break
    }
  }

  getEntityFor(username: string): ecs.Entity | undefined {
    const id = this.entityIdsByName.get(username)
    if (id) {
      return this.world.getEntity(id)
    } else {
      return undefined
    }
  }

  private entityIdsByName: Map<string, number> = new Map()
  private quittingEntityIds: Set<number> = new Set()
}
