import { C } from "../../constants/designTokens";

type FieldProps = {
  label: string;
  value: string | number | undefined;
  editing: boolean;
  onChange: (value: string) => void;
  full?: boolean;
  type?: string;
  rows?: number;
};

export default function Field({
  label,
  value,
  editing,
  onChange,
  full,
  type = "text",
  rows,
}: FieldProps) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label
        style={{
          fontSize: 12,
          color: C.muted,
          display: "block",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {editing ? (
        rows ? (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        )
      ) : (
        <div
          style={{
            fontSize: 14,
            color: value ? C.text : C.mutedLight,
            padding: "8px 0",
            borderBottom: `1px solid ${C.borderLight}`,
          }}
        >
          {value || "—"}
        </div>
      )}
    </div>
  );
}
