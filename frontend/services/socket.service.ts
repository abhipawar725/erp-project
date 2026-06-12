import { io, Socket }    from 'socket.io-client';
import { store } from '../store';

const WS_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:5000';

export interface PermissionUpdateEvent {
  eventType:    'role_assigned' | 'role_removed' | 'permissions_updated' | 'bulk_permissions_updated' | 'access_revoked';
  companyId:    number;
  message:      string;
  triggeredBy?: string;
  actorEmployeeId?: number;
  changes?: {
    roleName?:        string;
    addedSlugs?:      string[];
    removedSlugs?:    string[];
    affectedModules?: string[];
  };
  timestamp: string;
}

export interface AccessRevokedEvent {
  companyId:   number;
  companyName: string;
  message:     string;
  timestamp:   string;
}

export interface CompanySuspendedEvent {
  companyId:   number;
  companyName: string;
  message:     string;
  timestamp:   string;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(managedCompanyIds: number[] = []): void {
    const token = store.getState().auth.accessToken
    if (!token) return;

    if (this.socket?.connected) {
      this.joinCompanyRooms(managedCompanyIds);
      return;
    }

    this.socket = io(WS_URL, {
      auth:       { token },
      transports: ['websocket', 'polling'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
      timeout:              10000,
    });

    this.socket.on('connect', () => {
      console.log("CONNECTED", this.socket?.id);
      console.debug('[Socket] Connected:', this.socket?.id);
      this.joinCompanyRooms(managedCompanyIds);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log("DISCONNECTED", reason);
      console.debug('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      // Non-fatal — app works without socket
      console.warn('[Socket] Connection error (non-critical):', err.message);
    });


this.socket.io.on("reconnect_error", (err) => {
  console.log("RECONNECT ERROR", err);
});

this.socket.io.on("error", (err) => {
  console.log("MANAGER ERROR", err);
});    
    // Forward server events to listeners
    const EVENTS = ['permissions:updated', 'access:revoked', 'company:suspended'];
    for (const event of EVENTS) {
      this.socket.on(event, (data: any) => this.trigger(event, data));
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  joinCompanyRooms(companyIds: number[]): void {
    for (const id of companyIds) {
      this.socket?.emit('join:company', id);
    }
  }

  acknowledge(employeeId: number): void {
    this.socket?.emit('permissions:acknowledged', { employeeId });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on(event: 'permissions:updated', handler: (d: PermissionUpdateEvent) => void): () => void;
  on(event: 'access:revoked',      handler: (d: AccessRevokedEvent)       => void): () => void;
  on(event: 'company:suspended',   handler: (d: CompanySuspendedEvent)    => void): () => void;
  on(event: string, handler: Function): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
      console.log(
    event,
    "listeners:",
    this.listeners.get(event)?.size
  );
    return () => this.listeners.get(event)?.delete(handler);
  }

  private trigger(event: string, data: any): void {
    console.log("TRIGGER", event, data);
    this.listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[Socket] Handler error [${event}]:`, e); }
    });
  }
}

export const socketService = new SocketService();
