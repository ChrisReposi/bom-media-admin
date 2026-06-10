import type { MouseEventHandler } from "react";

type ButtonProps = {
  bg: string;
  color: string;
  text: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const Button = ({
  bg,
  color,
  text,
  disabled = false,
  onClick = () => {},
}: ButtonProps) => {
  return (
    <button
      className="bg-[#F7696580] h-full rounded-sm px-3.75! opacity-80 hover:opacity-100 min-w-20"
      style={{ backgroundColor: bg }}
      disabled={disabled}
      onClick={onClick}
    >
      <p
        className="text-[#FFFFFF4D] text-sm font-semibold"
        style={{ color: color }}
      >
        {text}
      </p>
    </button>
  );
};

export default Button;
