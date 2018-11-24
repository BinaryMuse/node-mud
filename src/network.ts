import * as net from "net"

import * as split2 from "split2"

import * as ecs from "./ecs"

export const EVENTS = {
  /// Emitted by the NetworkSystem when a line
  /// of data is received on a connection.
  PLAYER_INPUT: Symbol("PLAYER_INPUT"),
  /// Emit with an `Entity` and a `string | Buffer` of data
  /// to ask the NetworkSystem to send that data to the entity.
  SEND_DATA: Symbol("SEND_DATA"),
  /// Emit with an `Entity` to ask the system
  /// to close the socket associated with that entity.
  PERFORM_DISCONNECT: Symbol("PERFORM_DISCONNECT"),
  /// Emit with `oldEntity: Entity` and `newEntity: Entity` to
  /// parent the connection from `oldEntity` to `newEntity`.
  SWITCH_CONN_OWNERSHIP: Symbol("SWITCH_CONN_OWNERSHIP"),
}

export class HasConnection extends ecs.Component {
  constructor(conn: net.Socket, wasReassigned: boolean = false) {
    super()
    this.conn = conn
    this.wasReassigned = wasReassigned
  }

  public conn: net.Socket
  public wasReassigned: boolean
}

export class NetworkSystem extends ecs.System {
  constructor(port: number) {
    super()
    this.port = port
  }

  configure() {
    this.subscribe(EVENTS.SEND_DATA, this.send.bind(this))
    this.subscribe(EVENTS.PERFORM_DISCONNECT, this.performDisconnect.bind(this))
    this.subscribe(EVENTS.SWITCH_CONN_OWNERSHIP, this.switchConnOwnership.bind(this))

    this.server = net.createServer((conn: net.Socket) => {
      conn.setNoDelay()
      conn.setTimeout(5 * 60 * 1000)

      const ent = this.world.createEntity()
      console.debug(`[DEBUG] Assigning entity ${ent.getId()} to a new connection`)
      ent.addComponent(new HasConnection(conn))
      this.entityIdByConn.set(conn, ent.getId())

      conn.pipe(split2()).on("data", this.handleInput.bind(this, conn))
      conn.on('close', this.handleClose.bind(this, conn))
      conn.on('timeout', this.handleTimeout.bind(this, conn))
    })

    this.server.listen(this.port, () => {
      console.log(`[  LOG] Server listening on port ${this.port}`)
    })
  }

  unconfigure() {
    this.server!.close()
    this.entityIdByConn.clear()
  }

  send(entity: ecs.Entity, data: string | Buffer): void {
    const hasConn = entity.getComponent(HasConnection)
    if (hasConn) {
      hasConn.conn.write(data)
    } else {
      console.warn(`[ WARN] Could not send message to entity ${entity.getId()} because the entity did not have the HasConnection component`)
    }
  }

  performDisconnect(entity: ecs.Entity): void {
    const hasConn = entity.getComponent(HasConnection)
    if (hasConn) {
      hasConn.conn.end()
      this.removeConnComponent(hasConn.conn)
    } else {
      console.warn(`[ WARN] Got request to perform disconnect for entity ${entity.getId()} but it has no connection`)
    }
  }

  switchConnOwnership(oldEntity: ecs.Entity, newEntity: ecs.Entity) {
    const newHasConn = newEntity.getComponent(HasConnection)
    if (newHasConn) {
      // Someone else is already connected to this entity.
      this.send(newEntity, "You feel like you're being pushed out of your own mind!\n")
      this.performDisconnect(newEntity)
    }

    const oldHasConn = oldEntity.getComponent(HasConnection)
    if (!oldHasConn) {
      console.error(`[ERROR] Attempted to switch connection owner but old entity ${oldEntity.getId()} has no connection`)
      return
    }

    const conn = oldHasConn.conn
    newEntity.addComponent(new HasConnection(conn, true))
    oldEntity.removeComponent(HasConnection)
    this.send(newEntity, "You feel yourself inhabit your existing body.\n")
    this.entityIdByConn.set(conn, newEntity.getId())
  }

  handleInput(conn: net.Socket, line: string): void {
    const entityId = this.entityIdByConn.get(conn)
    if (entityId) {
      this.world.emit(EVENTS.PLAYER_INPUT, line, this.world.getEntity(entityId))
    } else {
      console.error(`[ERROR] Could not find an entity associated with data on an incoming socket`)
    }
  }

  handleClose(conn: net.Socket, hadError: boolean): void {
    if (hadError) {
      console.warn(`[ WARN] A socket belonging to entity ${this.entityIdByConn.get(conn)} had an error and was closed`)
    } else {
      console.debug("[DEBUG] A socket has been closed without error")
    }

    this.removeConnComponent(conn)
  }

  handleTimeout(conn: net.Socket): void {
    console.warn(`[ WARN] A socket belonging to entity ${this.entityIdByConn.get(conn)} has timed out and will be closed`)
    conn.write("\n\nClosing connection due to inactivity.\n")
    conn.end()
  }

  removeConnComponent(conn: net.Socket): void {
    const ent = this.getEntityFor(conn)
    this.entityIdByConn.delete(conn)
    if (ent) {
      ent.removeComponent(HasConnection)
    }
  }

  getEntityFor(conn: net.Socket): ecs.Entity | undefined {
    const id = this.entityIdByConn.get(conn)
    if (id) {
      return this.world.getEntity(id)
    } else {
      return undefined
    }
  }

  private port: number
  private server: net.Server | null = null
  private entityIdByConn: Map<net.Socket, number> = new Map()
}
