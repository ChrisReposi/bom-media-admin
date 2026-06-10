import { Calendar } from "lucide-react";

type TimeSelectInputProps = {
  id: string;
  placeholder?: string;
  width?: string | number;
};

const TimeSelectInput = ({
  id,
  placeholder,
  width = "230px",
}: TimeSelectInputProps) => {
  return (
    <div
      className="flex h-8 flex-row items-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-3 text-[var(--admin-text-strong)] shadow-[var(--admin-shadow)]"
      style={{ width: width }}
    >
      <input
        id={id}
        type="text"
        className="h-full w-full pr-3 text-sm font-medium text-[var(--admin-text-strong)] placeholder:text-sm placeholder:text-[var(--admin-text-muted)]"
        placeholder={placeholder}
      />
      <button type="button">
        <Calendar size={14} color="var(--admin-text)" />
      </button>
    </div>
  );
};

export default TimeSelectInput;
