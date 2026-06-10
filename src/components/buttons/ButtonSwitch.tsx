type ButtonSwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  showText?: boolean;
};

const ButtonSwitch = ({
  checked,
  onChange,
  showText = false,
}: ButtonSwitchProps) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-13 h-6 rounded-full transition-all duration-300 ease-in-out ${
          checked ? "bg-[#3C7EFF]" : "bg-[#FFFFFF24]"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
            checked ? "translate-x-7" : "translate-x-0"
          }`}
        />
      </button>

      {showText && (
        <p
          className={`text-sm font-medium transition-colors duration-300 ${
            checked ? "text-[#3C7EFF]" : "text-[#FFFFFFB3]"
          }`}
        >
          {checked ? "On" : "Off"}
        </p>
      )}
    </div>
  );
};

export default ButtonSwitch;
