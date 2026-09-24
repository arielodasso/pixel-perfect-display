import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, useNotifications } from "@/services/store";

/**
 * Campana de notificaciones del panel admin: lista las actividades recientes
 * (nuevos leads, cambios de estado) y permite marcarlas como leídas.
 */
export function NotificationBell() {
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid size-9 place-items-center rounded-lg border border-border bg-background/80 backdrop-blur-sm transition-colors",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-panel sm:w-96">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-medium">Notificaciones</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCheck className="size-3.5" /> Marcar todas
                </button>
              )}
            </div>

            <div className="no-scrollbar max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Sin notificaciones por ahora.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={cn("px-4 py-3", !notification.read && "bg-primary/5")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {!notification.read && (
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{notification.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDateTime(notification.date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                <Link to="/admin/leads">
                  <Users className="size-4" /> Ver bandeja de leads
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
