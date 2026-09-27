import { displayName, initials } from "@/lib/format";
import type { User } from "@/lib/types";

// The design has four avatar colour classes; pick one per user so colours stay stable.
const COLOR_CLASSES = ["person-yash", "person-alex", "person-priya", "person-sam"];

function colorClass(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLOR_CLASSES[hash % COLOR_CLASSES.length];
}

export function UserAvatar({
  user,
  small = false,
}: {
  user: Pick<User, "id" | "fullName" | "username" | "avatarUrl">;
  small?: boolean;
}) {
  const name = displayName(user);
  return (
    <span title={name} className={`avatar ${small ? "small" : ""} ${colorClass(user.id)}`} style={{ overflow: "hidden" }}>
      {user.avatarUrl ? (
        // Cloudinary URLs are external; a plain img keeps this simple and avoids image-domain config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
