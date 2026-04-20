import { AVATAR_COLORS } from "../../constants/designTokens";
import { getInitials } from "../../lib/utils";

export default function Avatar({ name, size = 36 }) {
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: "500",
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
