import { Minus, Plus } from "lucide-react";

type CalculatorInputProps = {
  id: string;
  placeholder?: string;
};

const CalculatorInput = ({ id, placeholder }: CalculatorInputProps) => {
  return (
    <div className="flex flex-row items-center">
      <button className="bg-[#29292C] h-8 w-8 flex items-center justify-center">
        <Minus size={20} color="#FFFFFFE6" />
      </button>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        defaultValue="0"
        className="placeholder:text-[#949a9a] bg-[#FFFFFF14] w-52.5 h-8 px-3 font-medium text-sm text-white"
      />
      <button className="bg-[#29292C] h-8 w-8 flex items-center justify-center">
        <Plus size={20} color="#FFFFFFE6" />
      </button>
    </div>
  );
};

export default CalculatorInput;
