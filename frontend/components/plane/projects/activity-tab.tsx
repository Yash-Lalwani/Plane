"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { UserAvatar } from "@/components/plane/user-avatar";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { activityText, displayName, formatDateTime, timeAgo } from "@/lib/format";
import { useActivity } from "@/lib/queries";

export function ActivityTab({ projectId }: { projectId: string }) {
  const activity = useActivity(projectId);
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];

  if (activity.isPending) return <p className="text-sm text-slate-400">Loading activity…</p>;
  if (activity.isError) return <p className="form-error">{errorMessage(activity.error)}</p>;

  if (items.length === 0) {
    return (
      <div className="workspace-empty">
        <ActivityIcon size={25} />
        <strong>No activity yet</strong>
        <p>Changes to tasks, members, invitations and notes will show up here.</p>
      </div>
    );
  }

  return (
    <div>
      {items.map((entry) => (
        <div className="activity-item" key={entry.id}>
          <UserAvatar user={entry.actor} />
          <div className="min-w-0 break-words">
            <strong>{displayName(entry.actor)}</strong> {activityText(entry)}
            <small title={formatDateTime(entry.createdAt)}>{timeAgo(entry.createdAt)}</small>
          </div>
        </div>
      ))}
      {activity.hasNextPage && (
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => activity.fetchNextPage()}
          disabled={activity.isFetchingNextPage}
        >
          {activity.isFetchingNextPage ? "Loading…" : "Load older activity"}
        </Button>
      )}
    </div>
  );
}
