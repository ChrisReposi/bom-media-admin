import { CircleChevronLeft } from "lucide-react";

type BackBtnProps = {
  bg?: string;
  color?: string;
  text?: string;
};

const BackBtn = ({ bg, color, text }: BackBtnProps) => {
  return (
    <button
      className="bg-[#F7696580] h-full rounded-sm px-3.75! opacity-80 hover:opacity-100 flex flex-row items-center gap-2"
      style={{ backgroundColor: bg }}
    >
      <CircleChevronLeft size={14} color="white" />
      <p
        className="text-[#FFFFFF4D] text-sm font-semibold"
        style={{ color: color }}
      >
        {text}
      </p>
    </button>
  );
};

export default BackBtn;
