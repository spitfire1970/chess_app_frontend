import React, { ChangeEvent, InputHTMLAttributes } from 'react';

interface MyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  placeholder?: string;
  f: (value: string) => void;
}

function MyInput({ placeholder, f, ...props }: MyInputProps): React.ReactElement {
  return (
    <input
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => f(e.target.value)}
      className="bg-transparent placeholder:text-slate-400 text-white text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow" 
      {...props}
    />
  );
}

export default MyInput;