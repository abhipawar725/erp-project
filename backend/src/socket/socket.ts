/**
 * socket.ts — Socket.IO server
 *
 * Architecture:
 *   - Every connected employee joins room: `employee:{employeeId}`
 *   - Also joins company room: `company:{companyId}`
 *   - Admin actions emit to specific employee rooms
 *
 * Security rules:
 *   - Socket connection requires a valid JWT (same as HTTP)
 *   - Socket is ONLY for UI notification — never trusted for authorization
 *   - Backend API always re-checks permissions on every HTTP request
 *   - Socket payload never includes sensitive permission data beyond slugs
 *     (same data already in the JWT, just a notification to re-fetch)
 *
 * Events emitted to client:
 *   permissions:updated  → employee should refresh their permissions
 *   role:changed         → employee's role was changed
 *   access:revoked       → employee was removed from a company
 *   company:suspended    → company was suspended
 */
import { Server as HttpServer }    from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken }       from '../utils/jwt';
import { logger }                  from '../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PermissionUpdatePayload {
  employeeId:   number;
  companyId:    number;
  eventType:    'role_assigned' | 'role_removed' | 'permissions_updated' | 'bulk_permissions_updated' | 'access_revoked';
  message:      string;          // human-readable toast message
  triggeredBy?: string;  
  actorEmployeeId: number;        // name of admin who made the change
  // What changed — for UI display only, NOT for authorization
  changes?: {
    roleName?:        string;
    addedSlugs?:      string[];
    removedSlugs?:    string[];
    affectedModules?: string[];
  };
}

export interface SocketData {
  employeeId: number;
  companyId:  number;
  email:      string;
}

// ─── Module-level IO instance (singleton) ────────────────────────────────────

let io: SocketServer | null = null;

// ─── Initialize Socket.IO ─────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports:       ['websocket', 'polling'],
    pingTimeout:      60000,
    pingInterval:     25000,
    maxHttpBufferSize: 1e6,
  });

  // ── Auth middleware — same JWT as HTTP ───────────────────────────────────────
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token
                 || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      socket.data = {
        employeeId: payload.employeeId,
        companyId:  payload.companyId,
        email:      payload.email,
      } as SocketData;

      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const { employeeId, companyId, email } = socket.data as SocketData;

    // Join personal room + company room
    socket.join(`employee:${employeeId}`);
    socket.join(`company:${companyId}`);

    logger.debug(`Socket connected: employee:${employeeId} (${email}) company:${companyId}`);

    // Client can join additional company rooms (for multi-company managers)
    socket.on('join:company', (cId: number) => {
      if (typeof cId === 'number' && cId > 0) {
        socket.join(`company:${cId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: employee:${employeeId} — ${reason}`);
    });

    // Client acknowledges receipt of permission update
    socket.on('permissions:acknowledged', (data: { employeeId: number }) => {
      logger.debug(`Permission update acknowledged by employee:${data.employeeId}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

// ─── Get IO instance ──────────────────────────────────────────────────────────

export function getIO(): SocketServer | null {
  return io;
}

// ─── Broadcast permission update to specific employees ───────────────────────
// Called from role/permission assignment controllers after DB changes

export function emitPermissionUpdate(payload: PermissionUpdatePayload): void {
  if (!io) {
    logger.warn('Socket.IO not initialized — skipping permission broadcast');
    return;
  }

  const room = `employee:${payload.employeeId}`;

  // Emit to all sockets in that employee's room
  io.to(room).emit('permissions:updated', {
    eventType:    payload.eventType,
    companyId:    payload.companyId,
    message:      payload.message,
    triggeredBy:  payload.triggeredBy,
    changes:      payload.changes,
    timestamp:    new Date().toISOString(),
  });

  logger.info(`Permission update emitted → employee:${payload.employeeId} [${payload.eventType}]`);
}

// ─── Broadcast to entire company ─────────────────────────────────────────────
// Used when a role's permissions change — affects ALL employees with that role

export function emitCompanyPermissionUpdate(
  companyId: number,
  payload: Omit<PermissionUpdatePayload, 'employeeId' | 'companyId'>,
): void {
  if (!io) return;

  io.to(`company:${companyId}`).emit('permissions:updated', {
    ...payload,
    companyId,
    timestamp: new Date().toISOString(),
  });

  logger.info(`Company-wide permission update emitted → company:${companyId} [${payload.eventType}]`);
}

// ─── Emit access revoked ──────────────────────────────────────────────────────

export function emitAccessRevoked(employeeId: number, companyId: number, companyName: string): void {
  if (!io) return;

  io.to(`employee:${employeeId}`).emit('access:revoked', {
    companyId,
    companyName,
    message:   `Your access to ${companyName} has been revoked. Please switch to another company.`,
    timestamp: new Date().toISOString(),
  });
}

// ─── Emit company suspended ───────────────────────────────────────────────────

export function emitCompanySuspended(companyId: number, companyName: string): void {
  if (!io) return;

  io.to(`company:${companyId}`).emit('company:suspended', {
    companyId,
    companyName,
    message:   `${companyName} has been suspended. You will be logged out of this company.`,
    timestamp: new Date().toISOString(),
  });
}

// ─── Online users count per company (utility) ─────────────────────────────────

export async function getOnlineCount(companyId: number): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(`company:${companyId}`).fetchSockets();
  return sockets.length;
}
