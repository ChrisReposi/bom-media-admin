import { ChevronDown } from "lucide-react";

const ExtendBtn = ({ label = "Mở rộng" }) => {
  return (
    <button className="flex flex-row justify-center items-center gap-0.5 min-w-20 h-8 px-2 text-[#165DFF] rounded-sm hover:bg-[#FFFFFFE8]">
      <p className="text-sm font-medium">{label}</p>
      <ChevronDown size={14} />
    </button>
  );
};

export default ExtendBtn;
