import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface ClaimCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

const ClaimCodeInput = ({ value, onChange, disabled, error }: ClaimCodeInputProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        disabled={disabled}
        pattern="[A-Za-z0-9]*"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className={`w-12 h-14 text-xl font-bold uppercase ${
                error ? "border-destructive text-destructive" : ""
              }`}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error && (
        <p className="text-sm text-destructive font-medium">
          Invalid claim code. Please check your packaging and try again.
        </p>
      )}
    </div>
  );
};

export default ClaimCodeInput;
