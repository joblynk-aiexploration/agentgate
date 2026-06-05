import { Bell, KeyRound, LogOut } from "lucide-react";
import type { MembershipRole, Notification } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/sidebar";
import { requireMembership } from "@/lib/auth";
import { formatEnumLabel, formatRelativeTime } from "@/lib/format";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { notificationIdSchema } from "@/lib/validators";

async function markNotificationReadAction(formData: FormData) {
  "use server";

  const membership = await requireMembership();
  const parsed = notificationIdSchema.safeParse(formData.get("notificationId"));

  if (parsed.success) {
    await markNotificationRead(membership, parsed.data);
  }
}

async function markAllNotificationsReadAction() {
  "use server";

  const membership = await requireMembership();

  await markAllNotificationsRead(membership);
}

export function Topbar({
  notifications,
  organizationName,
  userDisplayName,
  userEmail,
  role,
  unreadNotificationCount,
}: {
  notifications: Notification[];
  organizationName: string;
  userDisplayName: string;
  userEmail: string;
  role: MembershipRole;
  unreadNotificationCount: number;
}) {
  return (
    <header className="border-b border-[#d9dee8] bg-white px-5 py-4 shadow-sm sm:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#4c6f68]">{organizationName}</p>
          <p className="mt-1 text-sm text-[#5c6470]">
            {userDisplayName} · {userEmail} · {formatEnumLabel(role)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <details className="relative">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center gap-2 border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#172326] transition hover:bg-[#f5f7fb] [&::-webkit-details-marker]:hidden">
              <span className="relative">
                <Bell className="h-4 w-4" aria-hidden />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-[#9d3f1f] px-1 text-[10px] font-bold leading-none text-white">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                ) : null}
              </span>
              Notifications
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-2rem))] border border-[#d9dee8] bg-white shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-[#e5e9ef] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-[#687384]">
                    {unreadNotificationCount} unread
                  </p>
                </div>
                <form action={markAllNotificationsReadAction}>
                  <Button
                    className="h-8 px-2 text-xs"
                    disabled={unreadNotificationCount === 0}
                    type="submit"
                    variant="secondary"
                  >
                    Mark all read
                  </Button>
                </form>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <article
                      className="border-b border-[#edf1f6] px-4 py-3 last:border-0"
                      key={notification.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[#34404a]">
                            {notification.body}
                          </p>
                          <p className="mt-2 text-xs text-[#687384]">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {notification.readAt ? (
                          <span className="mt-0.5 border border-[#cbd3df] bg-[#f5f7fb] px-2 py-1 text-xs font-semibold text-[#687384]">
                            Read
                          </span>
                        ) : (
                          <form action={markNotificationReadAction}>
                            <input
                              name="notificationId"
                              type="hidden"
                              value={notification.id}
                            />
                            <Button
                              className="h-8 px-2 text-xs"
                              type="submit"
                              variant="ghost"
                            >
                              Read
                            </Button>
                          </form>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-[#687384]">
                    No notifications yet. Approval, security, and API key events
                    will appear here.
                  </p>
                )}
              </div>
            </div>
          </details>
          <Button href="/developer/api-keys" variant="secondary">
            <KeyRound className="h-4 w-4" aria-hidden />
            API Keys
          </Button>
          <form action="/logout" method="post">
            <Button type="submit">
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </Button>
          </form>
        </div>
      </div>

      <MobileNav />
    </header>
  );
}
